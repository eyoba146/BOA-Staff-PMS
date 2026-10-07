import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ISODate, PerformancePeriod } from '@/types';
import { cn } from '@/utils/cn';
import { getPeriodBounds, PERIOD_LABELS, shiftPeriod, todayISO } from '@/utils/date';
import { IconButton, SegmentedControl } from '../ui';

const PERIODS: PerformancePeriod[] = ['daily', 'weekly', 'monthly', 'quarterly'];

interface PeriodSelectorProps {
  period: PerformancePeriod;
  date: ISODate;
  onChange: (next: { period: PerformancePeriod; date: ISODate }) => void;
  className?: string;
}

/** Period granularity + previous/next navigation. Future periods are not selectable. */
export function PeriodSelector({ period, date, onChange, className }: PeriodSelectorProps) {
  const today = todayISO();
  const bounds = getPeriodBounds(period, date);
  const isCurrent = bounds.start <= today && today <= bounds.end;

  const go = (offset: number) => {
    const next = shiftPeriod(period, date, offset);
    onChange({ period, date: next > today ? today : next });
  };

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center', className)}>
      <SegmentedControl
        label="Reporting period"
        value={period}
        onChange={(p) => onChange({ period: p, date })}
        items={PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
        className="w-full sm:w-auto"
      />
      <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1">
        <IconButton label={`Previous ${period} period`} size="sm" onClick={() => go(-1)}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <span className="min-w-36 flex-1 text-center text-[13px] font-medium text-zinc-800 tabular" aria-live="polite">
          {bounds.label}
        </span>
        <IconButton label={`Next ${period} period`} size="sm" onClick={() => go(1)} disabled={isCurrent} className="disabled:opacity-30">
          <ChevronRight className="size-4" />
        </IconButton>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => onChange({ period, date: today })}
            className="ml-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Current
          </button>
        )}
      </div>
    </div>
  );
}
