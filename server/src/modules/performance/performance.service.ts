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
import { getSettings } from '../settings/settings.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getRequestId } from '../../utils/request-context.js';

function diagnostic(message: string, meta: Record<string, unknown> = {}) {
  if (env.NODE_ENV !== 'development') return;
  logger.debug(message, { requestId: getRequestId(), ...meta });
}

async function timedQuery<T>(label: string, query: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await query();
    diagnostic('Performance database operation completed', {
      operation: label,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      rowCount: Array.isArray(result) ? result.length : undefined,
    });
    return result;
  } catch (error) {
    diagnostic('Performance database operation failed', {
      operation: label,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      error: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
}

function settingsConfig(settingsData: Awaited<ReturnType<typeof getSettings>>): PerformanceSettingsConfig {
  return {
    onTargetMin: settingsData.thresholds.onTargetMin,
    needsAttentionMin: settingsData.thresholds.needsAttentionMin,
    weightingEnabled: settingsData.weightingEnabled,
    thresholdsStatus: settingsData.thresholds.status,
  };
}

export interface PerformanceSettingsConfig {
  onTargetMin: number;
  needsAttentionMin: number;
  weightingEnabled: boolean;
  thresholdsStatus?: string;
}

/**
 * Pure, in-memory calculation of staff performance summary given preloaded assignments and entries.
 * Eliminates all database round trips so large batches can be calculated in microseconds.
 */
export function computeStaffSummary(
  staffId: string,
  from: string,
  to: string,
  assignments: any[],
  allEntries: any[],
  settings: PerformanceSettingsConfig
) {
  const onTargetMin = settings.onTargetMin ?? 85;
  const needsAttentionMin = settings.needsAttentionMin ?? 70;
  const weightingEnabled = settings.weightingEnabled ?? true;

  let submitted = 0;
  let expected = 0;

  const entriesByKpiId = new Map<string, any[]>();
  for (const entry of allEntries) {
    const list = entriesByKpiId.get(entry.kpiId) ?? [];
    list.push(entry);
    entriesByKpiId.set(entry.kpiId, list);
  }

  const kpiResults = assignments.map((asgn: any) => {
    const kpi = asgn.kpi;
    const target = asgn.targetOverride ?? kpi.target;
    const list = entriesByKpiId.get(kpi.id) ?? [];
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
      overall =
        totalW > 0
          ? rated.reduce((s: number, r: any) => s + (r.performancePercent ?? 0) * (r.weight ?? 0), 0) /
            totalW
          : null;
    } else {
      overall = rated.reduce((s: number, r: any) => s + (r.performancePercent ?? 0), 0) / rated.length;
    }
  }

  const allApproved =
    settings.thresholdsStatus === 'approved' &&
    assignments.every((a: any) => a.kpi?.ruleStatus === 'approved');

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

export async function summarizeStaffRange(staffId: string, from: string, to: string) {
  const staff = await timedQuery('summary.staff', () => prisma.user.findUnique({
    where: { id: staffId },
    select: { id: true, fullName: true, employeeId: true, positionTitle: true, status: true },
  }));

  if (!staff) {
    throw ApiError.notFound('Staff member not found.');
  }

  const [settingsData, assignments, allEntries] = await Promise.all([
    timedQuery('summary.settings', () => getSettings()),
    timedQuery<any[]>('summary.assignments', () => prisma.kpiAssignment.findMany({
      where: { staffId, kpi: { isActive: true } },
      include: { kpi: true },
    })),
    timedQuery<any[]>('summary.entries', () => prisma.kpiEntry.findMany({
      where: {
        staffId,
        date: { gte: from, lte: to },
      },
      select: { staffId: true, kpiId: true, date: true, actual: true, target: true },
    })),
  ]);

  const result = computeStaffSummary(staffId, from, to, assignments, allEntries, settingsConfig(settingsData));
  diagnostic('Performance summary calculated', {
    operation: 'summary',
    assignments: assignments.length,
    entries: allEntries.length,
    kpiResults: result.kpiResults.length,
  });
  return result;
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

const TREND_POINTS: Record<PerformancePeriod, number> = { daily: 14, weekly: 10, monthly: 6, quarterly: 4, yearly: 3 };

export function computeTrendFromData(
  staffIds: string[],
  period: PerformancePeriod,
  refDate: string,
  allAssignments: any[],
  allEntries: any[],
  weightingEnabled: boolean,
  points = TREND_POINTS[period] || 10
) {
  if (staffIds.length === 0) return [];

  const assignmentsByStaff = new Map<string, any[]>();
  for (const assignment of allAssignments) {
    const list = assignmentsByStaff.get(assignment.staffId) ?? [];
    list.push(assignment);
    assignmentsByStaff.set(assignment.staffId, list);
  }

  const entriesByStaff = new Map<string, Map<string, any[]>>();
  for (const entry of allEntries) {
    const byKpi = entriesByStaff.get(entry.staffId) ?? new Map<string, any[]>();
    const list = byKpi.get(entry.kpiId) ?? [];
    list.push(entry);
    byKpi.set(entry.kpiId, list);
    entriesByStaff.set(entry.staffId, byKpi);
  }

  const out = [];
  for (let i = points - 1; i >= 0; i--) {
    const pRef = shiftPeriod(period, refDate, -i);
    const b = getPeriodBounds(period, pRef);
    if (period === 'daily' && isSunday(b.start)) continue;

    const values: number[] = [];
    for (const id of staffIds) {
      const assignments = assignmentsByStaff.get(id) ?? [];
      const entriesByKpi = entriesByStaff.get(id) ?? new Map<string, any[]>();

      const kpiResults = assignments.map((asgn: any) => {
        const kpi = asgn.kpi;
        const target = asgn.targetOverride ?? kpi.target;
        const list = (entriesByKpi.get(kpi.id) ?? []).filter(
          (e: any) => e.date >= b.start && e.date <= b.end
        );
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
          overall =
            totalW > 0
              ? rated.reduce((s: number, r: any) => s + (r.percent ?? 0) * (r.weight ?? 0), 0) / totalW
              : null;
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
          ? start.toLocaleDateString('en-US', { month: 'short' })
          : b.label;

    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

    out.push({
      label,
      periodStart: b.start,
      percent: avg !== null && Number.isFinite(avg) ? Math.round(avg * 10) / 10 : null,
    });
  }
  return out;
}

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

  const [settingsData, allAssignments, allEntries] = await Promise.all([
    timedQuery('trend.settings', () => getSettings()),
    timedQuery<any[]>('trend.assignments', () => prisma.kpiAssignment.findMany({
      where: { staffId: { in: staffIds }, kpi: { isActive: true } },
      include: { kpi: true },
    })),
    timedQuery<any[]>('trend.entries', () => prisma.kpiEntry.findMany({
      where: {
        staffId: { in: staffIds },
        date: { gte: earliestBounds.start, lte: latestBounds.end },
      },
      select: { staffId: true, kpiId: true, date: true, actual: true, target: true },
    })),
  ]);

  const result = computeTrendFromData(
    staffIds,
    period,
    refDate,
    allAssignments,
    allEntries,
    settingsData.weightingEnabled,
    points
  );
  diagnostic('Performance trend calculated', {
    operation: 'trend',
    staffCount: staffIds.length,
    assignments: allAssignments.length,
    entries: allEntries.length,
    points: result.length,
  });
  return result;
}

/**
 * Loads the common performance inputs once for dashboard views that need both
 * the current-period summary and historical trend.
 */
export async function dashboardForStaff(staffId: string, period: PerformancePeriod, refDate: string) {
  const startedAt = performance.now();
  const bounds = getPeriodBounds(period, refDate);
  const points = TREND_POINTS[period] || 10;
  const earliestRef = shiftPeriod(period, refDate, -(points - 1));
  const earliestBounds = getPeriodBounds(period, earliestRef);

  const [staff, settingsData, assignments, allEntries] = await Promise.all([
    timedQuery('dashboard.staff', () => prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true },
    })),
    timedQuery('dashboard.settings', () => getSettings()),
    timedQuery<any[]>('dashboard.assignments', () => prisma.kpiAssignment.findMany({
      where: { staffId, kpi: { isActive: true } },
      include: { kpi: true },
    })),
    timedQuery<any[]>('dashboard.entries', () => prisma.kpiEntry.findMany({
      where: {
        staffId,
        date: { gte: earliestBounds.start, lte: bounds.end },
      },
      select: { staffId: true, kpiId: true, date: true, actual: true, target: true },
    })),
  ]);
  if (!staff) throw ApiError.notFound('Staff member not found.');

  const config = settingsConfig(settingsData);
  const periodEntries = allEntries.filter((entry: any) => entry.date >= bounds.start && entry.date <= bounds.end);
  const summary = {
    ...computeStaffSummary(staffId, bounds.start, bounds.end, assignments, periodEntries, config),
    period,
    periodLabel: bounds.label,
  };
  const trend = computeTrendFromData(
    [staffId],
    period,
    refDate,
    assignments,
    allEntries,
    settingsData.weightingEnabled,
    points
  );

  diagnostic('Performance dashboard calculated', {
    operation: 'dashboard',
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    assignments: assignments.length,
    entries: allEntries.length,
    points: trend.length,
  });
  return { summary, trend };
}

interface CachedOverview {
  data: any;
  timestamp: number;
}
const overviewCache = new Map<string, CachedOverview>();
const OVERVIEW_CACHE_TTL = 30000; // 30s cache

export function invalidateOverviewCache() {
  overviewCache.clear();
  reportCache.clear();
}

export async function getBranchOverview(period: PerformancePeriod, refDate: string) {
  const cacheKey = `${period}_${refDate}`;
  const cached = overviewCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OVERVIEW_CACHE_TTL) {
    return cached.data;
  }

  const b = getPeriodBounds(period, refDate);
  const today = todayISO();
  const checkDaily = !isSunday(today);
  const points = TREND_POINTS[period] || 10;
  const earliestRef = shiftPeriod(period, refDate, -(points - 1));
  const earliestBounds = getPeriodBounds(period, earliestRef);

  const staff = await prisma.user.findMany({
    where: { role: 'staff', status: 'active' },
    select: { id: true, fullName: true, employeeId: true, positionTitle: true },
  });

  const staffIds = staff.map((s: { id: string }) => s.id);

  // Fetch pending users, settings, KPIs, assignments, and historical entries in a single parallel batch
  const [pendingUsers, settingsData, activeKpis, allAssignments, allHistoricalEntries, todayEntries] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: 'staff', status: 'pending_approval' },
        select: { id: true, fullName: true },
      }),
      getSettings(),
      prisma.kpi.findMany({ where: { isActive: true } }),
      staffIds.length > 0
        ? prisma.kpiAssignment.findMany({
            where: { staffId: { in: staffIds }, kpi: { isActive: true } },
            include: { kpi: true },
          })
        : Promise.resolve([]),
      staffIds.length > 0
        ? prisma.kpiEntry.findMany({
            where: { staffId: { in: staffIds }, date: { gte: earliestBounds.start, lte: b.end } },
            select: { staffId: true, kpiId: true, date: true, actual: true, target: true },
          })
        : Promise.resolve([]),
      staffIds.length > 0 && checkDaily
        ? prisma.kpiEntry.findMany({
            where: { staffId: { in: staffIds }, date: today },
            select: { staffId: true, kpiId: true },
          })
        : Promise.resolve([]),
    ]);

  // Compute trend directly in-memory from preloaded historical entries
  const trend = computeTrendFromData(
    staffIds,
    period,
    refDate,
    allAssignments,
    allHistoricalEntries,
    settingsData.weightingEnabled,
    points
  );

  // Filter current period entries in memory
  const periodEntries = allHistoricalEntries.filter(
    (e: any) => e.date >= b.start && e.date <= b.end
  );

  // Index assignments and entries by staffId in memory
  const assignmentsByStaff = new Map<string, any[]>();
  for (const asgn of allAssignments) {
    const list = assignmentsByStaff.get(asgn.staffId) ?? [];
    list.push(asgn);
    assignmentsByStaff.set(asgn.staffId, list);
  }

  const entriesByStaff = new Map<string, any[]>();
  for (const entry of periodEntries) {
    const list = entriesByStaff.get(entry.staffId) ?? [];
    list.push(entry);
    entriesByStaff.set(entry.staffId, list);
  }

  const todayEntriesByStaff = new Map<string, number>();
  for (const entry of todayEntries) {
    todayEntriesByStaff.set(entry.staffId, (todayEntriesByStaff.get(entry.staffId) ?? 0) + 1);
  }

  const settingsConfig: PerformanceSettingsConfig = {
    onTargetMin: settingsData.thresholds.onTargetMin,
    needsAttentionMin: settingsData.thresholds.needsAttentionMin,
    weightingEnabled: settingsData.weightingEnabled,
    thresholdsStatus: settingsData.thresholds.status,
  };

  // Compute staff summaries in memory
  const rows: any[] = [];
  let expectedEntriesToday = 0;
  let entriesToday = 0;
  const attentionItems: any[] = [];

  for (const u of staff) {
    const staffAssignments = assignmentsByStaff.get(u.id) ?? [];
    const staffEntries = entriesByStaff.get(u.id) ?? [];
    const s = computeStaffSummary(u.id, b.start, b.end, staffAssignments, staffEntries, settingsConfig);

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

    if (checkDaily) {
      const dailyAssignments = staffAssignments.filter((a) => a.kpi.frequency === 'daily');
      const recordedToday = todayEntriesByStaff.get(u.id) ?? 0;

      expectedEntriesToday += dailyAssignments.length;
      entriesToday += recordedToday;

      if (dailyAssignments.length > 0 && recordedToday < dailyAssignments.length) {
        attentionItems.push({
          id: `ns_${u.id}`,
          kind: 'not_submitted',
          title: u.fullName,
          detail: `${dailyAssignments.length - recordedToday} of ${dailyAssignments.length} daily entries not yet submitted today`,
          staffId: u.id,
        });
      }
    }
  }

  const rated = rows.filter((r) => r.overallPercent !== null);
  const averagePercent = rated.length
    ? rated.reduce((s, r) => s + (r.overallPercent ?? 0), 0) / rated.length
    : null;

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

  for (const r of rows.filter((x) => x.status === 'below_target')) {
    attentionItems.push({
      id: `bt_${r.staffId}`,
      kind: 'below_target',
      title: r.fullName,
      detail: `Below target for ${b.label} (${r.overallPercent?.toFixed(1)}%)`,
      staffId: r.staffId,
    });
  }

  for (const p of pendingUsers) {
    attentionItems.push({
      id: `pa_${p.id}`,
      kind: 'pending_approval',
      title: p.fullName,
      detail: 'Registration awaiting approval',
      staffId: p.id,
    });
  }

  const allApproved =
    settingsData.thresholds.status === 'approved' &&
    activeKpis.every((k: any) => k.ruleStatus === 'approved');

  const result = {
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

  overviewCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

interface CachedReport {
  data: any;
  timestamp: number;
}
const reportCache = new Map<string, CachedReport>();
const REPORT_CACHE_TTL = 30000;

export function invalidateReportCache() {
  reportCache.clear();
}

export async function getPerformanceReport(period: PerformancePeriod, from: string, to: string) {
  if (from > to) {
    throw ApiError.badRequest('The start date must be before or equal to the end date.');
  }

  const cacheKey = `${period}_${from}_${to}`;
  const cached = reportCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < REPORT_CACHE_TTL) {
    return cached.data;
  }

  const staff = await prisma.user.findMany({
    where: { role: 'staff', status: 'active' },
    select: { id: true, fullName: true, employeeId: true, positionTitle: true },
  });

  const [activeKpis, settingsData] = await Promise.all([
    prisma.kpi.findMany({ where: { isActive: true } }),
    getSettings(),
  ]);

  const staffIds = staff.map((s: { id: string }) => s.id);

  const [allAssignments, periodEntries] = await Promise.all([
    staffIds.length > 0
      ? prisma.kpiAssignment.findMany({
          where: { staffId: { in: staffIds }, kpi: { isActive: true } },
          include: { kpi: true },
        })
      : Promise.resolve([]),
    staffIds.length > 0
      ? prisma.kpiEntry.findMany({
          where: { staffId: { in: staffIds }, date: { gte: from, lte: to } },
          select: { staffId: true, kpiId: true, date: true, actual: true, target: true },
        })
      : Promise.resolve([]),
  ]);

  // Index assignments and entries by staffId in memory
  const assignmentsByStaff = new Map<string, any[]>();
  for (const asgn of allAssignments) {
    const list = assignmentsByStaff.get(asgn.staffId) ?? [];
    list.push(asgn);
    assignmentsByStaff.set(asgn.staffId, list);
  }

  const entriesByStaff = new Map<string, any[]>();
  for (const entry of periodEntries) {
    const list = entriesByStaff.get(entry.staffId) ?? [];
    list.push(entry);
    entriesByStaff.set(entry.staffId, list);
  }

  const settingsConfig: PerformanceSettingsConfig = {
    onTargetMin: settingsData.thresholds.onTargetMin,
    needsAttentionMin: settingsData.thresholds.needsAttentionMin,
    weightingEnabled: settingsData.weightingEnabled,
    thresholdsStatus: settingsData.thresholds.status,
  };

  const byStaff: any[] = [];
  const summaries: any[] = [];

  for (const u of staff) {
    const staffAssignments = assignmentsByStaff.get(u.id) ?? [];
    const staffEntries = entriesByStaff.get(u.id) ?? [];
    const s = computeStaffSummary(u.id, from, to, staffAssignments, staffEntries, settingsConfig);

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

  // Aggregate KPI metrics in memory without additional database queries
  const onTargetMin = settingsData.thresholds.onTargetMin ?? 85;
  const needsAttentionMin = settingsData.thresholds.needsAttentionMin ?? 70;

  const entriesByKpiId = new Map<string, number>();
  for (const entry of periodEntries) {
    entriesByKpiId.set(entry.kpiId, (entriesByKpiId.get(entry.kpiId) ?? 0) + 1);
  }

  const byKpi = [];
  for (const k of activeKpis) {
    const results = summaries.flatMap((s) => s.kpiResults.filter((r: any) => r.kpiId === k.id));
    const rated = results.filter((r: any) => r.performancePercent !== null);
    const avg = rated.length ? rated.reduce((s: number, r: any) => s + (r.performancePercent ?? 0), 0) / rated.length : null;
    const entriesCount = entriesByKpiId.get(k.id) ?? 0;

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
    settingsData.thresholds.status === 'approved' &&
    activeKpis.every((k: any) => k.ruleStatus === 'approved');

  const result = {
    period,
    from,
    to,
    generatedAt: new Date().toISOString(),
    byStaff: byStaff.sort((a, z) => a.fullName.localeCompare(z.fullName)),
    byKpi,
    calculationBasis: allApproved ? ('approved' as const) : ('pending_validation' as const),
  };

  reportCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
