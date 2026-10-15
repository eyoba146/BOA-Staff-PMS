import { useState, useCallback } from 'react';
import {
  MessageSquareText,
  Plus,
  Search,
  Calendar,
  CheckCheck,
  Clock,
  Mail,
  AlertTriangle,
  RotateCw,
  Bell,
  Award,
} from 'lucide-react';
import { feedbackService } from '@/services/feedback.service';
import { staffService } from '@/services/staff.service';
import { kpiService } from '@/services/kpi.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { GiveFeedbackDialog } from '@/components/feedback/GiveFeedbackDialog';
import { Card, Button, Input, Select, Avatar, Badge, EmptyState } from '@/components/ui';
import type { CommunicationType, Feedback, FeedbackInput } from '@/types';
import { formatDateTime } from '@/utils/date';

export function ManagerFeedbackPage() {
  const { showToast } = useToast();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [giveDialogOpen, setGiveDialogOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [allFeedback, staffList, kpis] = await Promise.all([
      feedbackService.list({
        staffId: selectedStaffId !== 'all' ? selectedStaffId : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
      }),
      staffService.list({ status: 'active' }),
      kpiService.list({ status: 'active' }),
    ]);
    return { allFeedback, staffList, kpis };
  }, [selectedStaffId, selectedType]);

  const state = useAsync(loadData, [loadData]);

  const handleGiveFeedback = async (data: FeedbackInput) => {
    try {
      const res = await feedbackService.create(data);
      const recipientCount = res?.count ?? 1;
      const typeLabel = (data.type || 'feedback').toUpperCase();

      showToast({
        tone: 'success',
        title: `${typeLabel} Dispatched`,
        message:
          data.recipientType === 'all'
            ? `Successfully recorded and sent to all ${recipientCount} branch staff members.`
            : 'Communication recorded with in-app alert & email notification dispatched.',
      });
      await state.reload({ silent: true });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Dispatch Failed',
        message: err?.message || 'Could not record or dispatch communication.',
      });
    }
  };

  const handleRetryEmail = async (fb: Feedback) => {
    setRetryingId(fb.id);
    try {
      await feedbackService.retryEmail(fb.id);
      showToast({
        tone: 'success',
        title: 'Email Retried',
        message: `Transactional email resent to ${fb.staffName}.`,
      });
      await state.reload({ silent: true });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Retry Failed',
        message: err?.message || 'Could not resend email.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const typeBadge = (type?: CommunicationType) => {
    switch (type) {
      case 'warning':
        return (
          <Badge tone="danger" className="gap-1 font-semibold">
            <AlertTriangle className="size-3" /> Warning
          </Badge>
        );
      case 'reminder':
        return (
          <Badge tone="info" className="gap-1 font-semibold">
            <Bell className="size-3" /> Reminder
          </Badge>
        );
      case 'appreciation':
        return (
          <Badge tone="success" className="gap-1 font-semibold">
            <Award className="size-3" /> Appreciation
          </Badge>
        );
      case 'feedback':
      default:
        return (
          <Badge tone="attention" className="gap-1 font-semibold">
            <MessageSquareText className="size-3" /> Feedback
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Communications & Feedback"
        description="Issue structured performance feedback, action reminders, formal warnings, or recognition with multi-channel notification and audit logs."
        documentTitle="Staff Communications & Feedback"
        actions={
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto shadow-sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() => setGiveDialogOpen(true)}
          >
            Send Communication
          </Button>
        }
      />

      <AsyncBoundary state={state}>
        {({ allFeedback, staffList, kpis }) => {
          const filteredFeedback = allFeedback.filter((fb) => {
            const matchesStaff = selectedStaffId === 'all' || fb.staffId === selectedStaffId;
            const matchesType = selectedType === 'all' || (fb.type || 'feedback') === selectedType;
            const matchesSearch =
              fb.staffName.toLowerCase().includes(search.toLowerCase()) ||
              fb.subject.toLowerCase().includes(search.toLowerCase()) ||
              fb.message.toLowerCase().includes(search.toLowerCase());
            return matchesStaff && matchesType && matchesSearch;
          });

          return (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-zinc-200/90 shadow-xs">
                <div className="w-full sm:w-80">
                  <Input
                    placeholder="Search communications by subject, staff, or keyword..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 whitespace-nowrap">Recipient:</span>
                    <Select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-44 text-xs"
                    >
                      <option value="all">All staff members</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.position})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 whitespace-nowrap">Type:</span>
                    <Select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-36 text-xs"
                    >
                      <option value="all">All Types</option>
                      <option value="feedback">Feedback</option>
                      <option value="reminder">Reminder</option>
                      <option value="warning">Warning</option>
                      <option value="appreciation">Appreciation</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Communication History List */}
              {filteredFeedback.length === 0 ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="No communication records"
                  description="No communications match your current filter settings. You can send structured feedback, action reminders, or warnings anytime."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setGiveDialogOpen(true)}>
                      Send New Communication
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredFeedback.map((fb) => (
                    <Card key={fb.id} className="p-4 sm:p-5 transition-all hover:border-zinc-300">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Avatar name={fb.staffName} size="md" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-zinc-900">{fb.staffName}</h4>
                              {fb.employeeId && (
                                <span className="text-xs text-zinc-500 font-mono">({fb.employeeId})</span>
                              )}
                              {fb.position && (
                                <span className="text-xs text-zinc-500 font-medium">· {fb.position}</span>
                              )}
                              {typeBadge(fb.type)}
                              {fb.periodLabel && <Badge tone="info">{fb.periodLabel}</Badge>}
                              {fb.kpiName && <Badge tone="neutral">{fb.kpiName}</Badge>}
                            </div>
                            <p className="text-[13px] font-semibold text-zinc-800 mt-1">{fb.subject}</p>
                          </div>
                        </div>

                        {/* Delivery & Status Badges */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                          {/* In-App Read Status */}
                          {fb.readAt ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/80">
                              <CheckCheck className="size-3.5" /> Read
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/80">
                              <Clock className="size-3.5" /> In-App Delivered
                            </span>
                          )}

                          {/* Email Dispatch Status */}
                          {fb.emailStatus === 'sent' || fb.emailStatus === 'delivered' ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 border border-zinc-200"
                              title={fb.emailDeliveredAt ? `Dispatched at ${formatDateTime(fb.emailDeliveredAt)}` : 'Email sent'}
                            >
                              <Mail className="size-3.5 text-emerald-600" /> Email Sent
                            </span>
                          ) : fb.emailStatus === 'failed' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200"
                                title={fb.emailError || 'Email delivery failed'}
                              >
                                <AlertTriangle className="size-3.5" /> Email Failed
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-xs text-red-700 hover:bg-red-50"
                                loading={retryingId === fb.id}
                                onClick={() => handleRetryEmail(fb)}
                              >
                                <RotateCw className="size-3 mr-1" /> Retry
                              </Button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                              <Clock className="size-3.5" /> Email Queued
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-zinc-400 pl-1 border-l border-zinc-200">
                            <Calendar className="size-3 text-zinc-400" />
                            {formatDateTime(fb.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 text-xs text-zinc-700 leading-relaxed whitespace-pre-line">
                        {fb.message}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Send Communication Modal */}
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
