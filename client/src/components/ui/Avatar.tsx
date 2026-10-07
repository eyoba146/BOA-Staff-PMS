import { useEffect, useState } from 'react';
import type { PerformanceStatus } from '@/types';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import { PERFORMANCE_STATUS_META, TONE_CLASSES } from '@/utils/status';

export function Avatar({
  name,
  src,
  size = 'md',
  highlight,
  className,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  highlight?: boolean;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const showImg = Boolean(src && !imgError);

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none',
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-14 text-base',
        size === 'xl' && 'size-20 text-xl',
        highlight ? 'bg-gold-100 text-gold-800' : 'bg-zinc-200 text-zinc-700',
        className,
      )}
    >
      {showImg ? (
        <img
          src={src!}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/**
 * Horizontal progress bar. Values above 100 are visually capped; the caller displays the real figure.
 * Tone follows the backend-provided status.
 */
export function ProgressBar({ percent, status, label, className }: { percent: number | null; status: PerformanceStatus; label: string; className?: string }) {
  const tone = TONE_CLASSES[PERFORMANCE_STATUS_META[status].tone];
  const width = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent === null ? undefined : Math.round(width)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-200', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-300', tone.fill)} style={{ width: `${width}%` }} />
    </div>
  );
}
