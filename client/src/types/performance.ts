import type { ISODate, PerformancePeriod, RuleStatus } from './common';
import type { KpiValueType, PerformanceStatus } from './kpi';

export interface KpiPeriodResult {
  kpiId: string;
  kpiName: string;
  unit: string;
  valueType: KpiValueType;
  target: number;
  actual: number | null;
  performancePercent: number | null;
  status: PerformanceStatus;
  weight: number | null;
}

export interface PerformanceSummary {
  staffId: string;
  period: PerformancePeriod;
  periodStart: ISODate;
  periodEnd: ISODate;
  periodLabel: string;
  overallPercent: number | null;
  status: PerformanceStatus;
  entriesSubmitted: number;
  entriesExpected: number;
  kpiResults: KpiPeriodResult[];
  /** Whether the rules used for this calculation are approved. */
  calculationBasis: RuleStatus;
}

export interface TrendPoint {
  label: string;
  periodStart: ISODate;
  percent: number | null;
}

export interface StaffPerformanceRow {
  staffId: string;
  fullName: string;
  employeeId: string;
  position: string;
  overallPercent: number | null;
  status: PerformanceStatus;
  entriesSubmitted: number;
  entriesExpected: number;
}

export type AttentionKind = 'not_submitted' | 'below_target' | 'pending_approval';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  staffId?: string;
}

export interface BranchOverview {
  period: PerformancePeriod;
  periodLabel: string;
  activeStaff: number;
  pendingApprovals: number;
  entriesToday: number;
  expectedEntriesToday: number;
  averagePercent: number | null;
  statusBreakdown: Record<PerformanceStatus, number>;
  trend: TrendPoint[];
  staff: StaffPerformanceRow[];
  attentionItems: AttentionItem[];
  calculationBasis: RuleStatus;
}

export interface KpiReportRow {
  kpiId: string;
  kpiName: string;
  unit: string;
  valueType: KpiValueType;
  assignedStaff: number;
  entries: number;
  averagePercent: number | null;
  status: PerformanceStatus;
}

export interface PerformanceReport {
  period: PerformancePeriod;
  from: ISODate;
  to: ISODate;
  generatedAt: string;
  byStaff: StaffPerformanceRow[];
  byKpi: KpiReportRow[];
  calculationBasis: RuleStatus;
}
