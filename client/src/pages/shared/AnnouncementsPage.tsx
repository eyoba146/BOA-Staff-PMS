import { useState, useCallback } from 'react';
import { Megaphone, Pin, Filter } from 'lucide-react';
import { announcementService } from '@/services/announcement.service';
import { useAsync } from '@/hooks/useAsync';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { EmptyState } from '@/components/ui';
import type { AnnouncementCategory } from '@/types';

const CATEGORIES: { id: AnnouncementCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Notices' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'holiday', label: 'Holidays' },
  { id: 'notice', label: 'Notices' },
  { id: 'general', label: 'General' },
];

export function AnnouncementsPage() {
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'all'>('all');

  const loadAnnouncements = useCallback(async () => {
    return announcementService.list({ status: 'published' });
  }, []);

  const state = useAsync(loadAnnouncements, [loadAnnouncements]);

  const handleMarkRead = async (id: string) => {
    await announcementService.markRead(id);
    state.setData((prev) => prev?.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Announcements"
        description="Official notices, meeting schedules, holiday arrangements, and branch circulars."
        documentTitle="Announcements"
      />

      <AsyncBoundary state={state}>
        {(announcements) => {
          const filtered = selectedCategory === 'all'
            ? announcements
            : announcements.filter((a) => a.category === selectedCategory);

          const pinnedList = filtered.filter((a) => a.pinned);
          const regularList = filtered.filter((a) => !a.pinned);

          return (
            <div className="space-y-6">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-2">
                  <Filter className="size-3.5" /> Filter by:
                </span>
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  const count = cat.id === 'all'
                    ? announcements.length
                    : announcements.filter((a) => a.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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
    </div>
  );
}
