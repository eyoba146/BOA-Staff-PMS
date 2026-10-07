import { AlertCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AttentionItem, AttentionKind } from '@/types';
import { paths } from '@/routes/paths';
import { cn } from '@/utils/cn';

const KIND_META: Record<AttentionKind, { icon: typeof AlertCircle; tone: string; bg: string }> = {
  not_submitted: { icon: AlertTriangle, tone: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  below_target: { icon: AlertCircle, tone: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  pending_approval: { icon: UserCheck, tone: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50/60 p-4 text-center text-xs text-zinc-500">
        No immediate attention items for this branch.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const meta = KIND_META[item.kind];
        const Icon = meta.icon;
        const targetPath = item.kind === 'pending_approval'
          ? paths.manager.staff
          : item.staffId
          ? paths.manager.staffDetail(item.staffId)
          : paths.manager.performance;

        return (
          <li key={item.id}>
            <Link
              to={targetPath}
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 text-xs transition-colors hover:shadow-xs',
                meta.bg,
              )}
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', meta.tone)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-0.5 text-zinc-600 leading-relaxed">{item.detail}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
