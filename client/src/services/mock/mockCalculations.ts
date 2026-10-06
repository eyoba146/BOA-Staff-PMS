import type {
  ISODate,
  KpiEntry,
  KpiFrequency,
  KpiPeriodResult,
  PerformancePeriod,
  PerformanceStatus,
  PerformanceSummary,
  RuleStatus,
  SystemSettings,
  TrendPoint,
} from '@/types';
import { eachDay, getPeriodBounds, isSunday, parseISODate, shiftPeriod, todayISO } from '@/utils/date';
import type { MockDb, StoredEntry, StoredKpi } from './seed';

/**
 * ⚠ DEMONSTRATION CALCULATIONS — MOCK ADAPTER ONLY.
 *
 * Simulates what the Express backend will compute. Uses the SRS §16.2 *conceptual* formula
 * (Actual ÷ Target × 100) and placeholder thresholds from settings. None of this is an
 * official Bank of Abyssinia rule. Aggregation choices below (ratio of sums, missing entries
 * excluded from %, unweighted mean across KPIs) are ASSUMPTIONS pending validation (SRS §29).
 */

export function entryPercent(actual: number, target: number): number | null {
  if (!target) return null;
  return (actual / target) * 100;
}

export function statusFor(percent: number | null, settings: SystemSettings): PerformanceStatus {
  if (percent === null) return 'unrated';
  const { onTargetMin, needsAttentionMin } = settings.thresholds;
  if (percent >= onTargetMin) return 'on_target';
  if (percent >= needsAttentionMin) return 'needs_attention';
  return 'below_target';
}

export function toKpiEntry(e: StoredEntry, db: MockDb): KpiEntry {
  const kpi = db.kpis.find((k) => k.id === e.kpiId);
  const percent = entryPercent(e.actual, e.target);
  return {
    ...e,
    kpiName: kpi?.name ?? 'Unknown KPI',
    unit: kpi?.unit ?? '',
    valueType: kpi?.valueType ?? 'decimal',
    performancePercent: percent,
    status: statusFor(percent, db.settings),
  };
}

/** Distinct KPI-frequency periods (working days for daily) overlapping [from, to], capped at today. */
export function expectedSlots(freq: KpiFrequency, from: ISODate, to: ISODate): number {
  const end = to > todayISO() ? todayISO() : to;
  if (end < from) return 0;
  const seen = new Set<string>();
  for (const d of eachDay(from, end)) {
    if (freq === 'daily') {
      if (!isSunday(d)) seen.add(d);
    } else {
      seen.add(getPeriodBounds(freq, d).start);
    }
  }
  return seen.size;
}

/** Entries that belong to KPI periods overlapping [from, to]. */
function entriesInRange(db: MockDb, staffId: string, kpi: StoredKpi, from: ISODate, to: ISODate): StoredEntry[] {
  return db.entries.filter((e) => {
    if (e.staffId !== staffId || e.kpiId !== kpi.id) return false;
    if (kpi.frequency === 'daily') return e.date >= from && e.date <= to;
    const b = getPeriodBounds(kpi.frequency, e.date);
    return b.start <= to && b.end >= from;
  });
}

export function activeAssignedKpis(db: MockDb, staffId: string): Array<{ kpi: StoredKpi; target: number }> {
  return db.assignments
    .filter((a) => a.staffId === staffId)
    .map((a) => ({ a, kpi: db.kpis.find((k) => k.id === a.kpiId) }))
    .filter((x): x is { a: (typeof x)['a']; kpi: StoredKpi } => !!x.kpi && x.kpi.isActive)
    .map(({ a, kpi }) => ({ kpi, target: a.targetOverride ?? kpi.target }));
}

export function calculationBasis(db: MockDb, kpis: StoredKpi[]): RuleStatus {
  return db.settings.thresholds.status === 'approved' && kpis.every((k) => k.ruleStatus === 'approved')
    ? 'approved'
    : 'pending_validation';
}

export function summarizeRange(
  db: MockDb,
  staffId: string,
  from: ISODate,
  to: ISODate,
): Omit<PerformanceSummary, 'period' | 'periodLabel'> {
  const assigned = activeAssignedKpis(db, staffId);
  let submitted = 0;
  let expected = 0;

  const kpiResults: KpiPeriodResult[] = assigned.map(({ kpi, target }) => {
    const list = entriesInRange(db, staffId, kpi, from, to);
    const slots = expectedSlots(kpi.frequency, from, to);
    expected += slots;
    submitted += Math.min(list.length, slots || list.length);

    if (list.length === 0) {
      return {
        kpiId: kpi.id, kpiName: kpi.name, unit: kpi.unit, valueType: kpi.valueType, target,
        actual: null, performancePercent: null, status: 'not_submitted' as const, weight: kpi.weight,
      };
    }
    const isPct = kpi.valueType === 'percentage';
    const sumActual = list.reduce((s, e) => s + e.actual, 0);
    const sumTarget = list.reduce((s, e) => s + e.target, 0);
    const actual = isPct ? sumActual / list.length : sumActual;
    const periodTarget = isPct ? target : sumTarget;
    const percent = entryPercent(actual, periodTarget);
    return {
      kpiId: kpi.id, kpiName: kpi.name, unit: kpi.unit, valueType: kpi.valueType, target: periodTarget,
      actual, performancePercent: percent, status: statusFor(percent, db.settings), weight: kpi.weight,
    };
  });

  const rated = kpiResults.filter((r) => r.performancePercent !== null);
  let overall: number | null = null;
  if (rated.length) {
    const useWeights = db.settings.weightingEnabled && rated.every((r) => r.weight !== null && r.weight > 0);
    if (useWeights) {
      const totalW = rated.reduce((s, r) => s + (r.weight ?? 0), 0);
      overall = rated.reduce((s, r) => s + (r.performancePercent ?? 0) * (r.weight ?? 0), 0) / totalW;
    } else {
      overall = rated.reduce((s, r) => s + (r.performancePercent ?? 0), 0) / rated.length;
    }
  }

  return {
    staffId,
    periodStart: from,
    periodEnd: to,
    overallPercent: overall,
    status: assigned.length === 0 ? 'unrated' : overall === null ? 'not_submitted' : statusFor(overall, db.settings),
    entriesSubmitted: submitted,
    entriesExpected: expected,
    kpiResults,
    calculationBasis: calculationBasis(db, assigned.map((a) => a.kpi)),
  };
}

export function summarizePeriod(db: MockDb, staffId: string, period: PerformancePeriod, ref: ISODate): PerformanceSummary {
  const b = getPeriodBounds(period, ref);
  return { ...summarizeRange(db, staffId, b.start, b.end), period, periodLabel: b.label };
}

const TREND_POINTS: Record<PerformancePeriod, number> = { daily: 14, weekly: 10, monthly: 6, quarterly: 4 };

export function trendFor(
  db: MockDb,
  staffIds: string[],
  period: PerformancePeriod,
  ref: ISODate,
  points = TREND_POINTS[period],
): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const pRef = shiftPeriod(period, ref, -i);
    const b = getPeriodBounds(period, pRef);
    if (period === 'daily' && isSunday(b.start)) continue;
    const values = staffIds
      .map((id) => summarizeRange(db, id, b.start, b.end).overallPercent)
      .filter((v): v is number => v !== null);
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
