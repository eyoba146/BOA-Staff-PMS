import { env } from '@/config/env';
import type {
  AttentionItem,
  BranchOverview,
  ISODate,
  KpiReportRow,
  PerformancePeriod,
  PerformanceReport,
  PerformanceStatus,
  PerformanceSummary,
  StaffPerformanceRow,
  TrendPoint,
} from '@/types';
import { getPeriodBounds, isSunday, todayISO } from '@/utils/date';
import { api } from './http/apiClient';
import {
  activeAssignedKpis,
  calculationBasis,
  statusFor,
  summarizePeriod,
  summarizeRange,
  trendFor,
} from './mock/mockCalculations';
import { getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError } from './mock/mockUtils';
import type { MockDb } from './mock/seed';

/** Aggregated performance. All percentages/statuses are computed server-side. */
export interface PerformanceService {
  getMySummary(period: PerformancePeriod, date: ISODate): Promise<PerformanceSummary>;
  getMyTrend(period: PerformancePeriod, date: ISODate): Promise<TrendPoint[]>;
  getStaffSummary(staffId: string, period: PerformancePeriod, date: ISODate): Promise<PerformanceSummary>;
  getStaffTrend(staffId: string, period: PerformancePeriod, date: ISODate): Promise<TrendPoint[]>;
  getBranchOverview(period: PerformancePeriod, date: ISODate): Promise<BranchOverview>;
  getReport(period: PerformancePeriod, from: ISODate, to: ISODate): Promise<PerformanceReport>;
}

// ---------------- HTTP adapter ----------------
const httpPerformanceService: PerformanceService = {
  getMySummary: (period, date) => api.get<PerformanceSummary>('/performance/me', { period, date }),
  getMyTrend: (period, date) => api.get<TrendPoint[]>('/performance/me/trend', { period, date }),
  getStaffSummary: (staffId, period, date) => api.get<PerformanceSummary>(`/performance/staff/${staffId}`, { period, date }),
  getStaffTrend: (staffId, period, date) => api.get<TrendPoint[]>(`/performance/staff/${staffId}/trend`, { period, date }),
  getBranchOverview: (period, date) => api.get<BranchOverview>('/performance/branch', { period, date }),
  getReport: (period, from, to) => api.get<PerformanceReport>('/performance/report', { period, from, to }),
};

// ---------------- Mock adapter ----------------
const activeStaff = (db: MockDb) => db.users.filter((u) => u.role === 'staff' && u.status === 'active');

function staffRow(db: MockDb, staffId: string, from: ISODate, to: ISODate): StaffPerformanceRow {
  const u = db.users.find((x) => x.id === staffId)!;
  const s = summarizeRange(db, staffId, from, to);
  return {
    staffId,
    fullName: u.fullName,
    employeeId: u.employeeId,
    position: u.position,
    overallPercent: s.overallPercent,
    status: s.status,
    entriesSubmitted: s.entriesSubmitted,
    entriesExpected: s.entriesExpected,
  };
}

function assertStaff(db: MockDb, staffId: string) {
  if (!db.users.some((u) => u.id === staffId && u.role === 'staff')) throw mockError(404, 'NOT_FOUND', 'Staff member not found.');
}

function emptyBreakdown(): Record<PerformanceStatus, number> {
  return { on_target: 0, needs_attention: 0, below_target: 0, not_submitted: 0, unrated: 0 };
}

const mockPerformanceService: PerformanceService = {
  async getMySummary(period, date) {
    await delay();
    return summarizePeriod(getDb(), requireUser().id, period, date);
  },
  async getMyTrend(period, date) {
    await delay();
    return trendFor(getDb(), [requireUser().id], period, date);
  },
  async getStaffSummary(staffId, period, date) {
    await delay();
    requireManager();
    const db = getDb();
    assertStaff(db, staffId);
    return summarizePeriod(db, staffId, period, date);
  },
  async getStaffTrend(staffId, period, date) {
    await delay();
    requireManager();
    const db = getDb();
    assertStaff(db, staffId);
    return trendFor(db, [staffId], period, date);
  },
  async getBranchOverview(period, date) {
    await delay(400);
    requireManager();
    const db = getDb();
    const staff = activeStaff(db);
    const b = getPeriodBounds(period, date);
    const rows = staff.map((u) => staffRow(db, u.id, b.start, b.end));
    const rated = rows.filter((r) => r.overallPercent !== null);
    const averagePercent = rated.length ? rated.reduce((s, r) => s + (r.overallPercent ?? 0), 0) / rated.length : null;

    const statusBreakdown = emptyBreakdown();
    rows.forEach((r) => statusBreakdown[r.status]++);

    // "Today" counts: daily KPIs only (periodic KPIs are not expected every day).
    const today = todayISO();
    let expectedEntriesToday = 0;
    let entriesToday = 0;
    const attentionItems: AttentionItem[] = [];
    if (!isSunday(today)) {
      for (const u of staff) {
        const daily = activeAssignedKpis(db, u.id).filter((a) => a.kpi.frequency === 'daily');
        const done = daily.filter((a) => db.entries.some((e) => e.staffId === u.id && e.kpiId === a.kpi.id && e.date === today)).length;
        expectedEntriesToday += daily.length;
        entriesToday += done;
        if (daily.length && done < daily.length) {
          attentionItems.push({
            id: `ns_${u.id}`,
            kind: 'not_submitted',
            title: u.fullName,
            detail: `${daily.length - done} of ${daily.length} daily entries not yet submitted today`,
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
    const pending = db.users.filter((u) => u.role === 'staff' && u.status === 'pending_approval');
    for (const p of pending) {
      attentionItems.push({ id: `pa_${p.id}`, kind: 'pending_approval', title: p.fullName, detail: 'Registration awaiting approval', staffId: p.id });
    }

    return {
      period,
      periodLabel: b.label,
      activeStaff: staff.length,
      pendingApprovals: pending.length,
      entriesToday,
      expectedEntriesToday,
      averagePercent,
      statusBreakdown,
      trend: trendFor(db, staff.map((s) => s.id), period, date),
      staff: rows.sort((a, z) => (z.overallPercent ?? -1) - (a.overallPercent ?? -1)),
      attentionItems,
      calculationBasis: calculationBasis(db, db.kpis.filter((k) => k.isActive)),
    };
  },
  async getReport(period, from, to) {
    await delay(500);
    requireManager();
    const db = getDb();
    if (from > to) throw mockError(422, 'INVALID_RANGE', 'The start date must be before the end date.');
    const staff = activeStaff(db);
    const byStaff = staff.map((u) => staffRow(db, u.id, from, to));
    const summaries = staff.map((u) => summarizeRange(db, u.id, from, to));
    const byKpi: KpiReportRow[] = db.kpis
      .filter((k) => k.isActive)
      .map((k) => {
        const results = summaries.flatMap((s) => s.kpiResults.filter((r) => r.kpiId === k.id));
        const rated = results.filter((r) => r.performancePercent !== null);
        const avg = rated.length ? rated.reduce((s, r) => s + (r.performancePercent ?? 0), 0) / rated.length : null;
        const entries = db.entries.filter((e) => e.kpiId === k.id && e.date >= from && e.date <= to && staff.some((s) => s.id === e.staffId)).length;
        return {
          kpiId: k.id,
          kpiName: k.name,
          unit: k.unit,
          valueType: k.valueType,
          assignedStaff: results.length,
          entries,
          averagePercent: avg,
          status: results.length === 0 ? 'unrated' : avg === null ? 'not_submitted' : statusFor(avg, db.settings),
        };
      });
    return {
      period,
      from,
      to,
      generatedAt: new Date().toISOString(),
      byStaff: byStaff.sort((a, z) => a.fullName.localeCompare(z.fullName)),
      byKpi,
      calculationBasis: calculationBasis(db, db.kpis.filter((k) => k.isActive)),
    };
  },
};

export const performanceService: PerformanceService = env.useMockApi ? mockPerformanceService : httpPerformanceService;
