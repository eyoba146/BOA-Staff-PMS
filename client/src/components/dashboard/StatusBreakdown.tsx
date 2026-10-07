import type { PerformanceStatus } from '@/types';
import { PERFORMANCE_STATUS_META, TONE_CLASSES } from '@/utils/status';
import { cn } from '@/utils/cn';

interface StatusBreakdownProps {
  breakdown: Record<PerformanceStatus, number>;
  total: number;
}

const ORDER: PerformanceStatus[] = ['on_target', 'needs_attention', 'below_target', 'not_submitted', 'unrated'];

export function StatusBreakdown({ breakdown, total }: StatusBreakdownProps) {
  if (total === 0) {
    return <p className="text-xs text-zinc-500">No staff members in this evaluation period.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Overview ratio bar with separated segments */}
      <div
        className="flex h-2.5 w-full gap-1.5"
        role="progressbar"
        aria-label="Staff status distribution ratio"
      >
        {ORDER.map((status) => {
          const count = breakdown[status] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          const meta = PERFORMANCE_STATUS_META[status];
          const tone = TONE_CLASSES[meta.tone];
          return (
            <div
              key={status}
              style={{ width: `${pct}%` }}
              className={cn('h-full rounded-full transition-all duration-300', tone.fill)}
              title={`${meta.label}: ${count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Itemized separate status distribution bars */}
      <div className="space-y-3 pt-1">
        {ORDER.map((status) => {
          const count = breakdown[status] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const meta = PERFORMANCE_STATUS_META[status];
          const tone = TONE_CLASSES[meta.tone];

          return (
            <div key={status} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('size-2 rounded-full shrink-0', tone.dot)} aria-hidden />
                  <span className={cn('font-medium truncate', count > 0 ? 'text-zinc-800' : 'text-zinc-500')}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 tabular text-xs shrink-0">
                  <span className={cn('font-semibold', count > 0 ? 'text-zinc-900' : 'text-zinc-400')}>
                    {count}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/40">
                <div
                  style={{ width: `${pct}%` }}
                  className={cn('h-full rounded-full transition-all duration-300', tone.fill)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
