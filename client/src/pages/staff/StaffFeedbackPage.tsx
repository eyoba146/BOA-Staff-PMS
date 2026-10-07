import { useState, useCallback } from 'react';
import { MessageSquareText, Calendar, CheckCircle2, User } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { feedbackService } from '@/services/feedback.service';
import { formatDate, formatDateTime } from '@/utils/date';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { Card, CardHeader, CardBody, Badge, EmptyState } from '@/components/ui';
import type { Feedback } from '@/types';
import { cn } from '@/utils/cn';

export function StaffFeedbackPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    const list = await feedbackService.listMine();
    return list;
  }, []);

  const state = useAsync(loadFeedback, [loadFeedback]);

  const handleSelectFeedback = async (item: Feedback) => {
    setSelectedId(item.id);
    if (!item.readAt) {
      await feedbackService.markRead(item.id);
      void state.reload({ silent: true });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Management Feedback"
        description="Performance evaluations, coaching notes, and commendations from your branch manager."
        documentTitle="Management Feedback"
      />

      <AsyncBoundary state={state}>
        {(feedbackList) => {
          const selectedItem = feedbackList.find((f) => f.id === selectedId) ?? feedbackList[0];

          if (feedbackList.length === 0) {
            return (
              <Card>
                <EmptyState
                  icon={MessageSquareText}
                  title="No feedback received"
                  description="When management provides performance notes or reviews, they will be listed here."
                />
              </Card>
            );
          }

          return (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Feedback List (5 cols on lg) */}
              <div className="space-y-3 lg:col-span-5">
                {feedbackList.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isUnread = !item.readAt;

                  return (
                    <div
                      key={item.id}
                      onClick={() => void handleSelectFeedback(item)}
                      className={cn(
                        'cursor-pointer rounded-lg border p-4 transition-all text-xs',
                        isSelected
                          ? 'border-ink-900 bg-white ring-1 ring-ink-900/10 shadow-xs'
                          : 'border-zinc-200 bg-white hover:border-zinc-300',
                        isUnread && 'border-l-4 border-l-gold-500',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-zinc-900 text-sm">{item.subject}</span>
                        {isUnread && <Badge tone="gold">New</Badge>}
                      </div>

                      <p className="mt-1.5 text-zinc-600 line-clamp-2 leading-relaxed">{item.message}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                        <span>{item.managerName}</span>
                        <span>·</span>
                        <span>{formatDate(item.createdAt, 'short')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feedback Detail (7 cols on lg) */}
              <div className="lg:col-span-7">
                {selectedItem ? (
                  <Card className="sticky top-20">
                    <CardHeader
                      title={selectedItem.subject}
                      description={`Provided by ${selectedItem.managerName}`}
                      actions={
                        selectedItem.readAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Read
                          </span>
                        ) : null
                      }
                    />
                    <CardBody className="space-y-4">
                      {/* Context Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedItem.periodLabel && (
                          <Badge tone="info" icon={<Calendar className="size-3" />}>
                            Period: {selectedItem.periodLabel}
                          </Badge>
                        )}
                        {selectedItem.kpiName && (
                          <Badge tone="neutral">Indicator: {selectedItem.kpiName}</Badge>
                        )}
                      </div>

                      {/* Feedback Body */}
                      <div className="rounded-md bg-zinc-50/80 p-4 border border-zinc-100 text-sm leading-relaxed text-zinc-800 whitespace-pre-line">
                        {selectedItem.message}
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-100">
                        <span className="flex items-center gap-1.5">
                          <User className="size-3.5 text-zinc-400" />
                          Branch Manager: {selectedItem.managerName}
                        </span>
                        <span>Received {formatDateTime(selectedItem.createdAt)}</span>
                      </div>
                    </CardBody>
                  </Card>
                ) : null}
              </div>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
