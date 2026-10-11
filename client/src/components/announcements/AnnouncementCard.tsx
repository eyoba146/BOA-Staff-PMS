import { Pin, Calendar, Archive, Edit, ShieldCheck } from 'lucide-react';
import type { Announcement } from '@/types';
import { Card, Badge, Button } from '@/components/ui';
import { ANNOUNCEMENT_CATEGORY_META } from '@/utils/status';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/utils/cn';

interface AnnouncementCardProps {
  announcement: Announcement;
  isManager?: boolean;
  onEdit?: (a: Announcement) => void;
  onArchive?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

export function AnnouncementCard({
  announcement,
  isManager,
  onEdit,
  onArchive,
  onMarkRead,
}: AnnouncementCardProps) {
  const cat = ANNOUNCEMENT_CATEGORY_META[announcement.category];

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        announcement.pinned && 'border-gold-300 ring-1 ring-gold-200/60',
        !announcement.isRead && !isManager && 'border-l-4 border-l-gold-500',
      )}
      onClick={() => {
        if (!announcement.isRead && onMarkRead) onMarkRead(announcement.id);
      }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={cat.tone}>{cat.label}</Badge>
            {announcement.pinned && (
              <span className="inline-flex items-center gap-1 rounded bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-800 border border-gold-200">
                <Pin className="size-3 text-gold-600" />
                Pinned
              </span>
            )}
            {announcement.status === 'draft' && <Badge tone="neutral">Draft</Badge>}
            {announcement.status === 'archived' && <Badge tone="neutral">Archived</Badge>}
            {!announcement.isRead && !isManager && (
              <span className="size-2 rounded-full bg-gold-500" title="Unread" />
            )}
          </div>

          {isManager && (
            <div className="flex items-center gap-1.5">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Edit className="size-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(announcement);
                  }}
                >
                  Edit
                </Button>
              )}
              {announcement.status !== 'archived' && onArchive && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Archive className="size-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(announcement.id);
                  }}
                >
                  Archive
                </Button>
              )}
            </div>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-zinc-900">{announcement.title}</h3>

        <p className="mt-2 text-sm text-zinc-700 whitespace-pre-line leading-relaxed">
          {announcement.body}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 pt-3 border-t border-zinc-100">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950 border border-amber-200 shadow-2xs">
              <ShieldCheck className="size-3 text-amber-800" /> Issued by: Branch Manager ({announcement.authorName || 'Branch Management'})
            </span>
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Calendar className="size-3.5 text-zinc-400" />
            {formatDateTime(announcement.publishedAt ?? announcement.createdAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}
