import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import {
  getPeriodBounds,
  shiftPeriod,
  parseISODate,
  isSunday,
  todayISO,
  type PerformancePeriod,
} from '../../utils/date.js';
import {
  entryPercent,
  statusFor,
  expectedSlots,
  type PerformanceStatus,
} from '../../utils/calculations.js';

export async function summarizeStaffRange(staffId: string, from: string, to: string) {
  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    select: { id: true, fullName: true, employeeId: true, positionTitle: true, status: true },
  });

  if (!staff) {
    throw ApiError.notFound('Staff member not found.');
  }

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const onTargetMin = settings?.onTargetMin ?? 85;
  const needsAttentionMin = settings?.needsAttentionMin ?? 70;
  const weightingEnabled = settings?.weightingEnabled ?? true;

  const assignments = await prisma.kpiAssignment.findMany({
    where: { staffId, kpi: { isActive: true } },
    include: { kpi: true },
  });

  const allEntries = await prisma.kpiEntry.findMany({
    where: {
      staffId,
      date: { gte: from, lte: to },
    },
    include: { kpi: true },
  });

  let submitted = 0;
  let expected = 0;

  const kpiResults = assignments.map((asgn: any) => {
    const kpi = asgn.kpi;
    const target = asgn.targetOverride ?? kpi.target;
    const list = allEntries.filter((e: any) => e.kpiId === kpi.id);
    const slots = expectedSlots(kpi.frequency, from, to);
    expected += slots;
    submitted += Math.min(list.length, slots || list.length);

    if (list.length === 0) {
      return {
        kpiId: kpi.id,
        kpiName: kpi.name,
        unit: kpi.unit,
        valueType: kpi.valueType,
        target,
        actual: null,
        performancePercent: null,
        status: 'not_submitted' as PerformanceStatus,
        weight: kpi.weight,
      };
    }

    const isPct = kpi.valueType === 'percentage';
    const sumActual = list.reduce((s: number, e: any) => s + e.actual, 0);
    const sumTarget = list.reduce((s: number, e: any) => s + e.target, 0);
    const actual = isPct ? sumActual / list.length : sumActual;
    const periodTarget = isPct ? target : sumTarget;
    const percent = entryPercent(actual, periodTarget);

    return {
      kpiId: kpi.id,
      kpiName: kpi.name,
      unit: kpi.unit,
      valueType: kpi.valueType,
      target: periodTarget,
      actual,
      performancePercent: percent,
      status: statusFor(percent, onTargetMin, needsAttentionMin),
      weight: kpi.weight,
    };
  });

  const rated = kpiResults.filter((r: any) => r.performancePercent !== null);
  let overall: number | null = null;
  if (rated.length) {
    const useWeights = weightingEnabled && rated.every((r: any) => r.weight !== null && r.weight > 0);
    if (useWeights) {
      const totalW = rated.reduce((s: number, r: any) => s + (r.weight ?? 0), 0);
      overall = totalW > 0 ? rated.reduce((s: number, r: any) => s + (r.performancePercent ?? 0) * (r.weight ?? 0), 0) / totalW : null;
    } else {
      overall = rated.reduce((s: number, r: any) => s + (r.performancePercent ?? 0), 0) / rated.length;
    }
  }

  const allApproved =
    settings?.thresholdsStatus === 'approved' &&
    assignments.every((a: any) => a.kpi.ruleStatus === 'approved');

  return {
    staffId,
    periodStart: from,
    periodEnd: to,
    overallPercent: overall,
    status:
      assignments.length === 0
        ? ('unrated' as PerformanceStatus)
        : overall === null
          ? ('not_submitted' as PerformanceStatus)
          : statusFor(overall, onTargetMin, needsAttentionMin),
    entriesSubmitted: submitted,
    entriesExpected: expected,
    kpiResults,
    calculationBasis: allApproved ? ('approved' as const) : ('pending_validation' as const),
  };
}

export async function summarizeStaffPeriod(staffId: string, period: PerformancePeriod, refDate: string) {
  const b = getPeriodBounds(period, refDate);
  const summary = await summarizeStaffRange(staffId, b.start, b.end);
  return {
    ...summary,
    period,
    periodLabel: b.label,
  };
}

const TREND_POINTS: Record<PerformancePeriod, number> = { daily: 14, weekly: 10, monthly: 6, quarterly: 4 };

export async function trendForStaff(
  staffIds: string[],
  period: PerformancePeriod,
  refDate: string,
  points = TREND_POINTS[period] || 10
) {
  if (staffIds.length === 0) return [];

  const earliestRef = shiftPeriod(period, refDate, -(points - 1));
  const earliestBounds = getPeriodBounds(period, earliestRef);
  const latestBounds = getPeriodBounds(period, refDate);

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const weightingEnabled = settings?.weightingEnabled ?? true;

  const allAssignments = await prisma.kpiAssignment.findMany({
    where: { staffId: { in: staffIds }, kpi: { isActive: true } },
    include: { kpi: true },
  });

  const allEntries = await prisma.kpiEntry.findMany({
    where: {
      staffId: { in: staffIds },
      date: { gte: earliestBounds.start, lte: latestBounds.end },
    },
    include: { kpi: true },
  });

  const out = [];
  for (let i = points - 1; i >= 0; i--) {
    const pRef = shiftPeriod(period, refDate, -i);
    const b = getPeriodBounds(period, pRef);
    if (period === 'daily' && isSunday(b.start)) continue;

    const values: number[] = [];
    for (const id of staffIds) {
      const assignments = allAssignments.filter((a: any) => a.staffId === id);
      const entries = allEntries.filter((e: any) => e.staffId === id && e.date >= b.start && e.date <= b.end);

      const kpiResults = assignments.map((asgn: any) => {
        const kpi = asgn.kpi;
        const target = asgn.targetOverride ?? kpi.target;
        const list = entries.filter((e: any) => e.kpiId === kpi.id);
        if (list.length === 0) return { percent: null, weight: kpi.weight };

        const isPct = kpi.valueType === 'percentage';
        const sumActual = list.reduce((s: number, e: any) => s + e.actual, 0);
        const sumTarget = list.reduce((s: number, e: any) => s + e.target, 0);
        const actual = isPct ? sumActual / list.length : sumActual;
        const periodTarget = isPct ? target : sumTarget;
        const pct = entryPercent(actual, periodTarget);
        return { percent: pct, weight: kpi.weight };
      });

      const rated = kpiResults.filter((r: any) => r.percent !== null);
      if (rated.length) {
        const useWeights = weightingEnabled && rated.every((r: any) => r.weight !== null && r.weight > 0);
        let overall: number | null = null;
        if (useWeights) {
          const totalW = rated.reduce((s: number, r: any) => s + (r.weight ?? 0), 0);
          overall = totalW > 0 ? rated.reduce((s: number, r: any) => s + (r.percent ?? 0) * (r.weight ?? 0), 0) / totalW : null;
        } else {
          overall = rated.reduce((s: number, r: any) => s + (r.percent ?? 0), 0) / rated.length;
        }
        if (overall !== null) {
          values.push(overall);
        }
      }
    }

    const start = parseISODate(b.start);
    const label =
      period === 'daily' || period === 'weekly'
        ? start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : period === 'monthly'
          ? start.toLocaleDateString('en-GB', { month: 'short' })
          : b.label;

    out.push({
      label,
      periodStart: b.start,
      percent: values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : null,
    });
  }
  return out;
}

export async function getBranchOverview(period: PerformancePeriod, refDate: string) {
  const staff = await prisma.user.findMany({
    where: { role: 'staff', status: 'active' },
    select: { id: true, fullName: true, employeeId: true, positionTitle: true },
  });

  const b = getPeriodBounds(period, refDate);
  const rows: any[] = [];
  for (const u of staff) {
    const s = await summarizeStaffRange(u.id, b.start, b.end);
    rows.push({
      staffId: u.id,
      fullName: u.fullName,
      employeeId: u.employeeId ?? '',
      position: u.positionTitle,
      overallPercent: s.overallPercent,
      status: s.status,
      entriesSubmitted: s.entriesSubmitted,
      entriesExpected: s.entriesExpected,
    });
  }

  const rated = rows.filter((r) => r.overallPercent !== null);
  const averagePercent = rated.length ? rated.reduce((s, r) => s + (r.overallPercent ?? 0), 0) / rated.length : null;

  const statusBreakdown: Record<PerformanceStatus, number> = {
    on_target: 0,
    needs_attention: 0,
    below_target: 0,
    not_submitted: 0,
    unrated: 0,
  };
  rows.forEach((r) => {
    statusBreakdown[r.status as PerformanceStatus]++;
  });

  const today = todayISO();
  let expectedEntriesToday = 0;
  let entriesToday = 0;
  const attentionItems: any[] = [];

  if (!isSunday(today)) {
    for (const u of staff) {
      const dailyAssignments = await prisma.kpiAssignment.findMany({
        where: { staffId: u.id, kpi: { isActive: true, frequency: 'daily' } },
      });
      const entriesRecorded = await prisma.kpiEntry.count({
        where: { staffId: u.id, date: today },
      });

      expectedEntriesToday += dailyAssignments.length;
      entriesToday += entriesRecorded;

      if (dailyAssignments.length > 0 && entriesRecorded < dailyAssignments.length) {
        attentionItems.push({
          id: `ns_${u.id}`,
          kind: 'not_submitted',
          title: u.fullName,
          detail: `${dailyAssignments.length - entriesRecorded} of ${dailyAssignments.length} daily entries not yet submitted today`,
          staffId: u.id,
        });
      }
    }
  }

  for (const r of rows.filter((x) => x.status === 'below_target')) {
    attentionItems.push({
      id: `bt_${r.staffId}`,
      kind: 'below_target',
      title: r.fullName,
      detail: `Below target for ${b.label} (${r.overallPercent?.toFixed(1)}%)`,
      staffId: r.staffId,
    });
  }

  const pendingUsers = await prisma.user.findMany({
    where: { role: 'staff', status: 'pending_approval' },
  });
  for (const p of pendingUsers) {
    attentionItems.push({
      id: `pa_${p.id}`,
      kind: 'pending_approval',
      title: p.fullName,
      detail: 'Registration awaiting approval',
      staffId: p.id,
    });
  }

  const trend = await trendForStaff(staff.map((s: any) => s.id), period, refDate);

  const activeKpis = await prisma.kpi.findMany({ where: { isActive: true } });
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const allApproved =
    settings?.thresholdsStatus === 'approved' &&
    activeKpis.every((k: any) => k.ruleStatus === 'approved');

  return {
    period,
    periodLabel: b.label,
    activeStaff: staff.length,
    pendingApprovals: pendingUsers.length,
    entriesToday,
    expectedEntriesToday,
    averagePercent,
    statusBreakdown,
    trend,
    staff: rows.sort((a, z) => (z.overallPercent ?? -1) - (a.overallPercent ?? -1)),
    attentionItems,
    calculationBasis: allApproved ? ('approved' as const) : ('pending_validation' as const),
  };
}

export async function getPerformanceReport(period: PerformancePeriod, from: string, to: string) {
  if (from > to) {
    throw ApiError.badRequest('The start date must be before or equal to the end date.');
  }

  const staff = await prisma.user.findMany({
    where: { role: 'staff', status: 'active' },
    select: { id: true, fullName: true, employeeId: true, positionTitle: true },
  });

  const byStaff: any[] = [];
  const summaries: any[] = [];

  for (const u of staff) {
    const s = await summarizeStaffRange(u.id, from, to);
    summaries.push(s);
    byStaff.push({
      staffId: u.id,
      fullName: u.fullName,
      employeeId: u.employeeId ?? '',
      position: u.positionTitle,
      overallPercent: s.overallPercent,
      status: s.status,
      entriesSubmitted: s.entriesSubmitted,
      entriesExpected: s.entriesExpected,
    });
  }

  const activeKpis = await prisma.kpi.findMany({ where: { isActive: true } });
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  const onTargetMin = settings?.onTargetMin ?? 85;
  const needsAttentionMin = settings?.needsAttentionMin ?? 70;

  const byKpi = [];
  for (const k of activeKpis) {
    const results = summaries.flatMap((s) => s.kpiResults.filter((r: any) => r.kpiId === k.id));
    const rated = results.filter((r: any) => r.performancePercent !== null);
    const avg = rated.length ? rated.reduce((s: number, r: any) => s + (r.performancePercent ?? 0), 0) / rated.length : null;

    const entriesCount = await prisma.kpiEntry.count({
      where: {
        kpiId: k.id,
        date: { gte: from, lte: to },
        staff: { status: 'active' },
      },
    });

    byKpi.push({
      kpiId: k.id,
      kpiName: k.name,
      unit: k.unit,
      valueType: k.valueType,
      assignedStaff: results.length,
      entries: entriesCount,
      averagePercent: avg,
      status: results.length === 0 ? 'unrated' : avg === null ? 'not_submitted' : statusFor(avg, onTargetMin, needsAttentionMin),
    });
  }

  const allApproved =
    settings?.thresholdsStatus === 'approved' &&
    activeKpis.every((k: any) => k.ruleStatus === 'approved');

  return {
    period,
    from,
    to,
    generatedAt: new Date().toISOString(),
    byStaff: byStaff.sort((a, z) => a.fullName.localeCompare(z.fullName)),
    byKpi,
    calculationBasis: allApproved ? ('approved' as const) : ('pending_validation' as const),
  };
}
