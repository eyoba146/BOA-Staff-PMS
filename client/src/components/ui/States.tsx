import { AlertTriangle, CheckCircle2, Info, ShieldAlert, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

// ---------------- Skeleton ----------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-200/70', className)} aria-hidden />;
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 p-4 sm:p-5', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ---------------- Empty / Error ----------------
interface StateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: StateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-3 font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <XCircle className="size-5" aria-hidden />
      </span>
      <p className="mt-3 font-medium text-zinc-900">Could not load this information</p>
      <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ---------------- Alert ----------------
type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'validation';
const ALERT: Record<AlertTone, { cls: string; icon: LucideIcon }> = {
  info: { cls: 'border-sky-200 bg-sky-50 text-sky-900 [&_svg]:text-sky-600', icon: Info },
  success: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-900 [&_svg]:text-emerald-600', icon: CheckCircle2 },
  warning: { cls: 'border-orange-200 bg-orange-50 text-orange-900 [&_svg]:text-orange-600', icon: AlertTriangle },
  danger: { cls: 'border-red-200 bg-red-50 text-red-900 [&_svg]:text-red-600', icon: XCircle },
  validation: { cls: 'border-violet-200 bg-violet-50 text-violet-900 [&_svg]:text-violet-600', icon: ShieldAlert },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Alert({ tone = 'info', title, children, className, action }: AlertProps) {
  const { cls, icon: Icon } = ALERT[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex gap-3 rounded-md border px-3.5 py-3 text-[13px]', cls, className)}>
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
