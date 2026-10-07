import { useState, useCallback } from 'react';
import { MessageSquareText, Plus, Search, Calendar, CheckCheck, Clock } from 'lucide-react';
import { feedbackService } from '@/services/feedback.service';
import { staffService } from '@/services/staff.service';
import { kpiService } from '@/services/kpi.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { GiveFeedbackDialog } from '@/components/feedback/GiveFeedbackDialog';
import { Card, Button, Input, Select, Avatar, Badge, EmptyState } from '@/components/ui';
import type { FeedbackInput } from '@/types';
import { formatDateTime } from '@/utils/date';

export function ManagerFeedbackPage() {
  const { showToast } = useToast();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [giveDialogOpen, setGiveDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [allFeedback, staffList, kpis] = await Promise.all([
      feedbackService.list(selectedStaffId !== 'all' ? { staffId: selectedStaffId } : undefined),
      staffService.list({ status: 'active' }),
      kpiService.list({ status: 'active' }),
    ]);
    return { allFeedback, staffList, kpis };
  }, [selectedStaffId]);

  const state = useAsync(loadData, [loadData]);

  const handleGiveFeedback = async (data: FeedbackInput) => {
    try {
      await feedbackService.create({
        staffId: data.staffId,
        subject: data.subject,
        message: data.message,
        period: data.period ?? undefined,
        kpiId: data.kpiId ?? undefined,
      });
      showToast({ tone: 'success', title: 'Feedback delivered', message: 'Staff member has received your feedback.' });
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Submission failed', message: 'Could not deliver feedback.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Management Feedback"
        description="Provide structured performance guidance, coaching notes, commendations, and audit observations."
        documentTitle="Management Feedback"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() => setGiveDialogOpen(true)}
          >
            Give Feedback
          </Button>
        }
      />

      <AsyncBoundary state={state}>
        {({ allFeedback, staffList, kpis }) => {
          const filteredFeedback = allFeedback.filter((fb) => {
            const matchesStaff = selectedStaffId === 'all' || fb.staffId === selectedStaffId;
            const matchesSearch =
              fb.staffName.toLowerCase().includes(search.toLowerCase()) ||
              fb.subject.toLowerCase().includes(search.toLowerCase()) ||
              fb.message.toLowerCase().includes(search.toLowerCase());
            return matchesStaff && matchesSearch;
          });

          return (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search by subject, employee, or message..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Filter Staff:</span>
                  <Select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-52"
                  >
                    <option value="all">All staff members</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.position})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Feedback History List */}
              {filteredFeedback.length === 0 ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="No feedback records"
                  description="No feedback has been issued matching your filter criteria."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setGiveDialogOpen(true)}>
                      Give New Feedback
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredFeedback.map((fb) => (
                    <Card key={fb.id} className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={fb.staffName} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-zinc-900">{fb.staffName}</h4>
                              {fb.periodLabel && (
                                <Badge tone="info">{fb.periodLabel}</Badge>
                              )}
                              {fb.kpiName && (
                                <Badge tone="neutral">{fb.kpiName}</Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium text-zinc-700 mt-0.5">{fb.subject}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-zinc-400" />
                            {formatDateTime(fb.createdAt)}
                          </span>
                          {fb.readAt ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCheck className="size-3.5" /> Read
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              <Clock className="size-3.5" /> Unread
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-zinc-700 leading-relaxed whitespace-pre-line bg-zinc-50/70 p-3 rounded-md border border-zinc-100">
                        {fb.message}
                      </p>
                    </Card>
                  ))}
                </div>
              )}

              {/* Give Feedback Modal */}
              <GiveFeedbackDialog
                open={giveDialogOpen}
                onClose={() => setGiveDialogOpen(false)}
                staffList={staffList}
                kpis={kpis}
                defaultStaffId={selectedStaffId !== 'all' ? selectedStaffId : undefined}
                onSubmit={handleGiveFeedback}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
