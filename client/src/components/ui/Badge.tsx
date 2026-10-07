import type { ReactNode } from 'react';
import type { AccountStatus, PerformanceStatus, RuleStatus } from '@/types';
import { cn } from '@/utils/cn';
import { ACCOUNT_STATUS_META, PERFORMANCE_STATUS_META, TONE_CLASSES, type Tone } from '@/utils/status';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, dot, icon, className }: BadgeProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&>svg]:size-3.5',
        t.badge,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', t.dot)} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}

export function PerformanceStatusBadge({ status, className }: { status: PerformanceStatus; className?: string }) {
  const meta = PERFORMANCE_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const meta = ACCOUNT_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

/** Shows whether a rule/threshold has been approved by branch management. */
export function RuleStatusBadge({ status }: { status: RuleStatus }) {
  return status === 'approved' ? (
    <Badge tone="success">Approved rule</Badge>
  ) : (
    <Badge tone="validation">Pending validation</Badge>
  );
}

/** Small numeric counter used in navigation and tabs. */
export function CountBadge({ count, tone = 'gold', className }: { count: number; tone?: 'gold' | 'neutral'; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular',
        tone === 'gold' ? 'bg-gold-400 text-ink-950' : 'bg-zinc-200 text-zinc-700',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
