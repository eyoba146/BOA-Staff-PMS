import { eachDay, getPeriodBounds, isSunday, todayISO } from './date.js';

export type PerformanceStatus = 'on_target' | 'needs_attention' | 'below_target' | 'not_submitted' | 'unrated';

export function entryPercent(actual: number, target: number): number | null {
  if (!target || target <= 0) return null;
  return (actual / target) * 100;
}

export function statusFor(
  percent: number | null,
  onTargetMin: number = 85,
  needsAttentionMin: number = 70
): PerformanceStatus {
  if (percent === null || isNaN(percent)) return 'unrated';
  if (percent >= onTargetMin) return 'on_target';
  if (percent >= needsAttentionMin) return 'needs_attention';
  return 'below_target';
}

export function expectedSlots(freq: string, from: string, to: string): number {
  const end = to > todayISO() ? todayISO() : to;
  if (end < from) return 0;
  const seen = new Set<string>();
  for (const d of eachDay(from, end)) {
    if (freq === 'daily') {
      if (!isSunday(d)) seen.add(d);
    } else {
      seen.add(getPeriodBounds(freq as any, d).start);
    }
  }
  return seen.size;
}
