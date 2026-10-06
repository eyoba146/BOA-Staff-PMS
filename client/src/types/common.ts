/** Shared primitives used across the API contract. See docs/IMPLEMENTATION_PLAN.md §9. */

/** Business date in branch local time, formatted `YYYY-MM-DD`. */
export type ISODate = string;
/** Full ISO-8601 timestamp. */
export type ISODateTime = string;

export type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * Whether a rule/threshold/policy has been approved by branch management.
 * Anything `pending_validation` must be presented as demonstration-only.
 */
export type RuleStatus = 'approved' | 'pending_validation';

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/** Normalized error shape produced by the API client (and mock adapters). */
export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
