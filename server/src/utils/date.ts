export type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(value: string, days: number): string {
  const d = parseISODate(value);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffInDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

export function isSunday(value: string): boolean {
  return parseISODate(value).getDay() === 0;
}

export interface PeriodBounds {
  start: string;
  end: string;
  label: string;
}

export function formatDate(value: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = value.length === 10 ? parseISODate(value) : new Date(value);
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('en-GB', opts);
}

export function getPeriodBounds(period: PerformancePeriod, ref: string): PeriodBounds {
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

export function shiftPeriod(period: PerformancePeriod, ref: string, offset: number): string {
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

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let cur = from; cur <= to; cur = addDays(cur, 1)) days.push(cur);
  return days;
}
