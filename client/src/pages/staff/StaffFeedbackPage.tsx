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
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-zinc-900 text-sm">{item.subject}</span>
                            {item.type === 'warning' ? (
                              <Badge tone="danger" className="text-[10px] py-0 px-1.5">Warning</Badge>
                            ) : item.type === 'reminder' ? (
                              <Badge tone="info" className="text-[10px] py-0 px-1.5">Reminder</Badge>
                            ) : item.type === 'appreciation' ? (
                              <Badge tone="success" className="text-[10px] py-0 px-1.5">Appreciation</Badge>
                            ) : (
                              <Badge tone="attention" className="text-[10px] py-0 px-1.5">Feedback</Badge>
                            )}
                          </div>
                        </div>
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
                      description={`Issued by ${selectedItem.managerName}`}
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
                        {selectedItem.type === 'warning' ? (
                          <Badge tone="danger">Formal Warning</Badge>
                        ) : selectedItem.type === 'reminder' ? (
                          <Badge tone="info">Action Reminder</Badge>
                        ) : selectedItem.type === 'appreciation' ? (
                          <Badge tone="success">Staff Appreciation</Badge>
                        ) : (
                          <Badge tone="attention">Performance Feedback</Badge>
                        )}
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

                      {/* Suggested Action & Follow-up Date if provided */}
                      {(selectedItem.suggestedAction || selectedItem.followUpDate) && (
                        <div className="rounded-lg border border-gold-200 bg-gold-50/50 p-3.5 text-xs space-y-1.5">
                          <div className="font-semibold text-gold-950 flex items-center justify-between">
                            <span>Coaching & Action Plan:</span>
                            {selectedItem.followUpDate && (
                              <span className="text-[11px] font-normal text-gold-800">
                                Target Date: {formatDate(selectedItem.followUpDate)}
                              </span>
                            )}
                          </div>
                          {selectedItem.suggestedAction && (
                            <p className="text-zinc-700 leading-relaxed">{selectedItem.suggestedAction}</p>
                          )}
                        </div>
                      )}

                      {/* Staff Acknowledgment & Response Section */}
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-900">Coaching Status & Staff Response</span>
                          {selectedItem.acknowledgedAt ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="size-3" />
                              Acknowledged {formatDate(selectedItem.acknowledgedAt, 'short')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                await feedbackService.acknowledge(selectedItem.id);
                                void state.reload({ silent: true });
                              }}
                              className="inline-flex items-center gap-1 rounded bg-gold-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-gold-700 transition"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Acknowledge Coaching
                            </button>
                          )}
                        </div>

                        {selectedItem.staffReply ? (
                          <div className="rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-800 space-y-1">
                            <div className="text-[11px] font-semibold text-zinc-500">Your Response:</div>
                            <p className="leading-relaxed whitespace-pre-line">{selectedItem.staffReply}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              id={`reply-${selectedItem.id}`}
                              placeholder="Write a response or follow-up note back to the manager..."
                              rows={2}
                              className="w-full rounded border border-zinc-300 p-2 text-xs focus:border-gold-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const el = document.getElementById(`reply-${selectedItem.id}`) as HTMLTextAreaElement | null;
                                const text = el?.value?.trim();
                                if (text) {
                                  await feedbackService.reply(selectedItem.id, text);
                                  void state.reload({ silent: true });
                                }
                              }}
                              className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                            >
                              Send Response Note
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-100">
                        <span className="flex items-center gap-1.5">
                          <User className="size-3.5 text-zinc-400" />
                          Advisor: {selectedItem.managerName}
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
