import type { ISODate, ISODateTime, RuleStatus } from './common';

export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/** Drives input validation and formatting only — not calculation. */
export type KpiValueType = 'integer' | 'decimal' | 'currency' | 'percentage';

/**
 * KPI definition created by the Branch Manager.
 * Real KPIs, targets, formulas and weights are PENDING STAKEHOLDER VALIDATION (SRS §16, §29).
 */
export interface Kpi {
  id: string;
  name: string;
  description: string;
  /** Free-text measurement unit label, e.g. "count", "ETB", "%". */
  unit: string;
  valueType: KpiValueType;
  target: number;
  frequency: KpiFrequency;
  /** Optional weight in percent, only meaningful when weighting is enabled. */
  weight: number | null;
  /** Human-readable description of the approved calculation rule. */
  calculationRule: string | null;
  ruleStatus: RuleStatus;
  isActive: boolean;
  assignedStaffCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface KpiInput {
  name: string;
  description: string;
  unit: string;
  valueType: KpiValueType;
  target: number;
  frequency: KpiFrequency;
  weight: number | null;
  calculationRule: string | null;
  ruleStatus: RuleStatus;
  isActive: boolean;
}

export interface KpiAssignment {
  id: string;
  kpiId: string;
  staffId: string;
  /** Staff-specific target, if management sets individual targets. */
  targetOverride: number | null;
  assignedAt: ISODateTime;
}

export type PerformanceStatus =
  | 'on_target'
  | 'needs_attention'
  | 'below_target'
  | 'not_submitted'
  /** No approved thresholds / calculation available. */
  | 'unrated';

export interface KpiEntry {
  id: string;
  staffId: string;
  kpiId: string;
  kpiName: string;
  unit: string;
  valueType: KpiValueType;
  date: ISODate;
  actual: number;
  /** Target snapshot at time of submission. */
  target: number;
  /** Calculated by the backend; null when not calculable. */
  performancePercent: number | null;
  status: PerformanceStatus;
  note?: string;
  submittedAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** An assigned KPI as presented on the daily entry screen for a given date. */
export interface AssignedKpi {
  kpi: Kpi;
  target: number;
  entry: KpiEntry | null;
}

export interface KpiEntrySubmission {
  date: ISODate;
  entries: Array<{ kpiId: string; actual: number; note?: string }>;
}
