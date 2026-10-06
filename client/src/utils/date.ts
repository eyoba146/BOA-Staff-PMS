import type { ISODate, PerformancePeriod } from '@/types';

/** Date helpers operating on local business dates (`YYYY-MM-DD`). Weeks start on Monday (ASSUMPTION). */

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDays(value: ISODate, days: number): ISODate {
  const d = parseISODate(value);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffInDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

/** Used by mock data only. Official branch working days are not confirmed. */
export function isSunday(value: ISODate): boolean {
  return parseISODate(value).getDay() === 0;
}

export interface PeriodBounds {
  start: ISODate;
  end: ISODate;
  label: string;
}

/** Calendar bounds of the period containing `ref`. */
export function getPeriodBounds(period: PerformancePeriod, ref: ISODate): PeriodBounds {
  const d = parseISODate(ref);
  switch (period) {
    case 'daily':
      return { start: ref, end: ref, label: formatDate(ref, 'long') };
    case 'weekly': {
      const dow = (d.getDay() + 6) % 7; // Monday = 0
      const start = addDays(ref, -dow);
      const end = addDays(start, 6);
      return { start, end, label: `${formatDate(start, 'short')} – ${formatDate(end, 'short')}` };
    }
    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        start: toISODate(start),
        end: toISODate(end),
        label: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      };
    }
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3);
      const start = new Date(d.getFullYear(), q * 3, 1);
      const end = new Date(d.getFullYear(), q * 3 + 3, 0);
      return { start: toISODate(start), end: toISODate(end), label: `Q${q + 1} ${d.getFullYear()}` };
    }
  }
}

/** Reference date for the period `offset` periods before `ref`. */
export function shiftPeriod(period: PerformancePeriod, ref: ISODate, offset: number): ISODate {
  const d = parseISODate(ref);
  switch (period) {
    case 'daily':
      return addDays(ref, offset);
    case 'weekly':
      return addDays(ref, offset * 7);
    case 'monthly':
      return toISODate(new Date(d.getFullYear(), d.getMonth() + offset, 1));
    case 'quarterly':
      return toISODate(new Date(d.getFullYear(), d.getMonth() + offset * 3, 1));
  }
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let cur = from; cur <= to; cur = addDays(cur, 1)) days.push(cur);
  return days;
}

export function formatDate(value: ISODate | string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = value.length === 10 ? parseISODate(value) : new Date(value);
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('en-GB', opts);
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value: string): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** "Just now", "5 min ago", "Yesterday", or a date. */
export function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}

export const PERIOD_LABELS: Record<PerformancePeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};
