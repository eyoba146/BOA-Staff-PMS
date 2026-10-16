import { useState, useCallback } from 'react';
import { Megaphone, Pin, Filter, Plus, ShieldCheck } from 'lucide-react';
import { announcementService } from '@/services/announcement.service';
import { useAsync } from '@/hooks/useAsync';
import { useCurrentUser } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { AnnouncementFormDialog } from '@/components/announcements/AnnouncementFormDialog';
import { Button, EmptyState } from '@/components/ui';
import type { AnnouncementCategory, AnnouncementInput } from '@/types';

const CATEGORIES: { id: AnnouncementCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Notices' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'holiday', label: 'Holidays' },
  { id: 'notice', label: 'Notices' },
  { id: 'general', label: 'General' },
];

export function AnnouncementsPage() {
  const currentUser = useCurrentUser();
  const { showToast } = useToast();
  const isManager = currentUser.role === 'manager';

  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    return announcementService.list({ status: 'published' });
  }, []);

  const state = useAsync(loadAnnouncements, [loadAnnouncements]);

  const handleMarkRead = async (id: string) => {
    await announcementService.markRead(id);
    state.setData((prev) => prev?.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  };

  const handleCreateAnnouncement = async (data: AnnouncementInput) => {
    try {
      await announcementService.create(data);
      showToast({
        tone: 'success',
        title: 'Announcement Published',
        message: 'The official branch circular has been posted to all staff.',
      });
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Publish failed', message: 'Could not post announcement.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Announcements"
        description="Official notices, meeting schedules, holiday arrangements, and branch circulars."
        documentTitle="Announcements"
        actions={
          isManager ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => setCreateOpen(true)}
            >
              Post Announcement
            </Button>
          ) : undefined
        }
      />

      {/* Official Issuer Notice & Manager Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gold-300/70 bg-gradient-to-r from-gold-50/90 via-amber-50/40 to-white p-3.5 text-xs text-zinc-700 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-800 font-bold">
            <Megaphone className="size-4 text-gold-700" />
          </div>
          <div>
            <span className="font-bold text-zinc-900 block flex items-center gap-1.5">
              Official Branch Circulars & Notices
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                <ShieldCheck className="size-3 text-amber-800" /> Issued by Branch Management
              </span>
            </span>
            <span className="text-zinc-600 text-[11px] mt-0.5 block">
              Official circulars are authored exclusively by the <strong>Branch Manager</strong> for internal staff coordination, holidays, and operational directives.
            </span>
          </div>
        </div>
        {isManager && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="size-3.5" />}
            onClick={() => setCreateOpen(true)}
            className="shrink-0 self-start sm:self-center"
          >
            New Circular
          </Button>
        )}
      </div>

      <AsyncBoundary state={state}>
        {(announcements) => {
          const filtered =
            selectedCategory === 'all'
              ? announcements
              : announcements.filter((a) => a.category === selectedCategory);

          const pinnedList = filtered.filter((a) => a.pinned);
          const regularList = filtered.filter((a) => !a.pinned);

          return (
            <div className="space-y-6">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 overflow-x-auto scrollbar-thin whitespace-nowrap">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-2">
                  <Filter className="size-3.5" /> Filter by:
                </span>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  const count =
                    cat.id === 'all'
                      ? announcements.length
                      : announcements.filter((a) => a.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-ink-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                      }`}
                    >
                      {cat.label}
                      <span className={`text-[10px] ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements found"
                  description="There are currently no published announcements in this category."
                />
              ) : (
                <div className="space-y-6">
                  {/* Pinned Section */}
                  {pinnedList.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gold-700 tracking-wider uppercase">
                        <Pin className="size-3.5 text-gold-600" />
                        Pinned Notices
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {pinnedList.map((announcement) => (
                          <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            isManager={isManager}
                            onMarkRead={handleMarkRead}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Announcements */}
                  {regularList.length > 0 && (
                    <div className="space-y-3">
                      {pinnedList.length > 0 && (
                        <div className="text-xs font-medium text-zinc-500 tracking-wider uppercase">
                          Recent Notices
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        {regularList.map((announcement) => (
                          <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            isManager={isManager}
                            onMarkRead={handleMarkRead}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      </AsyncBoundary>

      {/* Post Announcement Modal for Managers */}
      {isManager && (
        <AnnouncementFormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateAnnouncement}
        />
      )}
    </div>
  );
}
