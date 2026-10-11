import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Card, Skeleton } from '../ui';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  meta?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
}

/** Key figure card. Keep to ≤ 4 per row. */
export function StatCard({ label, value, icon: Icon, meta, footer, loading, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col p-3 sm:p-4 lg:p-5', className)}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="text-xs sm:text-[13px] font-medium text-zinc-500 leading-snug line-clamp-2">{label}</p>
        {Icon && (
          <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
            <Icon className="size-3.5 sm:size-4" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-7 sm:h-8 w-20 sm:w-24" />
          <Skeleton className="mt-2 h-3.5 sm:h-4 w-24 sm:w-32" />
        </>
      ) : (
        <>
          <div className="mt-1 text-xl sm:text-2xl lg:text-[26px] leading-tight font-semibold tracking-tight text-zinc-900 tabular truncate">{value}</div>
          {meta && <div className="mt-1 sm:mt-1.5 text-xs sm:text-[13px] text-zinc-500 truncate">{meta}</div>}
        </>
      )}
      {footer && <div className="mt-auto pt-2 sm:pt-3">{footer}</div>}
    </Card>
  );
}
