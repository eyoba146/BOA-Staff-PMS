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
    <Card className={cn('flex flex-col p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{label}</p>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-32" />
        </>
      ) : (
        <>
          <div className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-zinc-900 tabular">{value}</div>
          {meta && <div className="mt-1.5 text-[13px] text-zinc-500">{meta}</div>}
        </>
      )}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </Card>
  );
}
