import type { KpiValueType } from '@/types';

const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFmt.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** Format a KPI value with its unit, according to value type. */
export function formatKpiValue(value: number | null | undefined, unit: string, valueType: KpiValueType): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (valueType === 'percentage') return `${numberFmt.format(value)}%`;
  if (valueType === 'currency') return `${numberFmt.format(value)} ${unit || 'ETB'}`;
  return unit ? `${numberFmt.format(value)} ${unit}` : numberFmt.format(value);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
