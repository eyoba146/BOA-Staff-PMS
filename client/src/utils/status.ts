import type { AccountStatus, AnnouncementCategory, KpiFrequency, PerformanceStatus } from '@/types';

/**
 * Presentation metadata for statuses. These are labels/tones only — the status values
 * themselves are produced by the backend (or the mock adapter) using approved rules.
 */
export type Tone = 'success' | 'attention' | 'danger' | 'info' | 'neutral' | 'validation' | 'gold';

export const PERFORMANCE_STATUS_META: Record<PerformanceStatus, { label: string; tone: Tone }> = {
  on_target: { label: 'On target', tone: 'success' },
  needs_attention: { label: 'Needs attention', tone: 'attention' },
  below_target: { label: 'Below target', tone: 'danger' },
  not_submitted: { label: 'Not submitted', tone: 'neutral' },
  unrated: { label: 'Unrated', tone: 'neutral' },
};

export const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; tone: Tone }> = {
  pending_approval: { label: 'Pending approval', tone: 'attention' },
  active: { label: 'Active', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  deactivated: { label: 'Deactivated', tone: 'neutral' },
};

export const FREQUENCY_LABELS: Record<KpiFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export const ANNOUNCEMENT_CATEGORY_META: Record<AnnouncementCategory, { label: string; tone: Tone }> = {
  meeting: { label: 'Meeting', tone: 'info' },
  holiday: { label: 'Holiday', tone: 'gold' },
  notice: { label: 'Notice', tone: 'attention' },
  general: { label: 'General', tone: 'neutral' },
};

/** Tailwind classes for each tone (badge / progress fill / dot). */
export const TONE_CLASSES: Record<Tone, { badge: string; fill: string; dot: string; text: string }> = {
  success: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', fill: 'bg-emerald-600', dot: 'bg-emerald-600', text: 'text-emerald-700' },
  attention: { badge: 'bg-orange-50 text-orange-700 ring-orange-200', fill: 'bg-orange-500', dot: 'bg-orange-500', text: 'text-orange-700' },
  danger: { badge: 'bg-red-50 text-red-700 ring-red-200', fill: 'bg-red-600', dot: 'bg-red-600', text: 'text-red-700' },
  info: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', fill: 'bg-sky-600', dot: 'bg-sky-600', text: 'text-sky-700' },
  neutral: { badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200', fill: 'bg-zinc-400', dot: 'bg-zinc-400', text: 'text-zinc-600' },
  validation: { badge: 'bg-violet-50 text-violet-700 ring-violet-200', fill: 'bg-violet-600', dot: 'bg-violet-600', text: 'text-violet-700' },
  gold: { badge: 'bg-gold-50 text-gold-800 ring-gold-200', fill: 'bg-gold-500', dot: 'bg-gold-500', text: 'text-gold-700' },
};

/** Hex values for charts (Recharts needs raw colors). */
export const STATUS_CHART_COLORS: Record<PerformanceStatus, string> = {
  on_target: '#059669',
  needs_attention: '#f97316',
  below_target: '#dc2626',
  not_submitted: '#a1a1aa',
  unrated: '#d4d4d8',
};

export const CHART_COLORS = {
  primary: '#eba312',
  ink: '#17171a',
  grid: '#e4e4e7',
  axis: '#71717a',
};
