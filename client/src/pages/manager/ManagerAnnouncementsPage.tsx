import { useState, useCallback } from 'react';
import { Megaphone, Plus, Archive, FileText } from 'lucide-react';
import { announcementService } from '@/services/announcement.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { AnnouncementFormDialog } from '@/components/announcements/AnnouncementFormDialog';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { Button, EmptyState } from '@/components/ui';
import type { Announcement, AnnouncementInput, AnnouncementStatus } from '@/types';

export function ManagerAnnouncementsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AnnouncementStatus>('published');

  // Form dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const loadAnnouncements = useCallback(async () => {
    return announcementService.list();
  }, []);

  const state = useAsync(loadAnnouncements, [loadAnnouncements]);

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    setEditingAnnouncement(a);
    setFormDialogOpen(true);
  };

  const handleSaveAnnouncement = async (data: AnnouncementInput) => {
    try {
      if (editingAnnouncement) {
        await announcementService.update(editingAnnouncement.id, data);
        showToast({ tone: 'success', title: 'Announcement updated', message: 'Changes have been saved.' });
      } else {
        await announcementService.create(data);
        showToast({ tone: 'success', title: 'Announcement created', message: 'New announcement has been saved.' });
      }
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Failed to save', message: 'Could not save the announcement.' });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await announcementService.archive(id);
      showToast({ tone: 'neutral', title: 'Archived', message: 'Announcement moved to archives.' });
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Error', message: 'Could not archive announcement.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Announcements Management"
        description="Publish branch circulars, meeting notices, holiday schedules, and general operational bulletins."
        documentTitle="Announcements Management"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={handleOpenCreate}
          >
            New Announcement
          </Button>
        }
      />

      <AsyncBoundary state={state}>
        {(announcements) => {
          const published = announcements.filter((a) => a.status === 'published');
          const drafts = announcements.filter((a) => a.status === 'draft');
          const archived = announcements.filter((a) => a.status === 'archived');

          const activeList =
            activeTab === 'published'
              ? published
              : activeTab === 'draft'
              ? drafts
              : archived;

          return (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex border-b border-zinc-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('published')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'published'
                      ? 'border-ink-900 text-ink-900'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                  }`}
                >
                  <Megaphone className="size-4" />
                  Published ({published.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('draft')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'draft'
                      ? 'border-ink-900 text-ink-900'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                  }`}
                >
                  <FileText className="size-4" />
                  Drafts ({drafts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('archived')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'archived'
                      ? 'border-ink-900 text-ink-900'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                  }`}
                >
                  <Archive className="size-4" />
                  Archived ({archived.length})
                </button>
              </div>

              {activeList.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title={`No ${activeTab} announcements`}
                  description={`There are currently no announcements marked as ${activeTab}.`}
                  action={
                    activeTab === 'published' || activeTab === 'draft' ? (
                      <Button variant="secondary" size="sm" onClick={handleOpenCreate}>
                        Create Announcement
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeList.map((announcement) => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      isManager
                      onEdit={handleOpenEdit}
                      onArchive={handleArchive}
                    />
                  ))}
                </div>
              )}

              {/* Form Dialog */}
              <AnnouncementFormDialog
                open={formDialogOpen}
                onClose={() => setFormDialogOpen(false)}
                announcement={editingAnnouncement}
                onSubmit={handleSaveAnnouncement}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
