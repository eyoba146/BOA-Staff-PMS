import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  MessageSquareText,
  MessagesSquare,
  Plus,
} from 'lucide-react';
import { performanceService } from '@/services/performance.service';
import { staffService } from '@/services/staff.service';
import { feedbackService } from '@/services/feedback.service';
import { kpiService } from '@/services/kpi.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { todayISO, formatDate } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import { paths } from '@/routes/paths';
import type { FeedbackInput, PerformancePeriod } from '@/types';
import { PageHeader, StatCard, PeriodSelector, AsyncBoundary } from '@/components/shared';
import { Card, CardHeader, CardBody, Button, Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { GiveFeedbackDialog } from '@/components/feedback/GiveFeedbackDialog';
import { StaffPerformanceTable } from '@/components/performance/StaffPerformanceTable';

export function CemDashboardPage() {
  const { showToast } = useToast();
  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'daily',
    date: todayISO(),
  });

  // Coaching Feedback dialog state
  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false);
  const [feedbackTargetStaffId, setFeedbackTargetStaffId] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    const [overview, inScopeStaff, feedbackList, kpis] = await Promise.all([
      performanceService.getBranchOverview(periodState.period, periodState.date).catch(() => null),
      staffService.listInScope(),
      feedbackService.list(),
      kpiService.list().catch(() => []),
    ]);

    return {
      overview,
      inScopeStaff,
      feedbackList,
      kpis,
    };
  }, [periodState.period, periodState.date]);

  const state = useAsync(loadData, [loadData]);

  const handleCreateFeedback = async (data: FeedbackInput) => {
    try {
      await feedbackService.create(data);
      showToast({
        tone: 'gold',
        title: 'Coaching Dispatched',
        message: 'Coaching record and notification successfully sent.',
      });
      void state.reload({ silent: true });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Error',
        message: err?.message || 'Failed to dispatch coaching.',
      });
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Experience Dashboard"
        description="Monitor staff KPI delivery within your assigned scope, track coaching follow-ups, and guide customer service excellence."
        documentTitle="Customer Experience Portal"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-3.5" />}
              onClick={() => {
                setFeedbackTargetStaffId(undefined);
                setGiveFeedbackOpen(true);
              }}
            >
              Provide Coaching Feedback
            </Button>
            <Link to={paths.cem.chat}>
              <Button variant="secondary" size="sm" leftIcon={<MessagesSquare className="size-3.5" />}>
                Group Chats & Moderation
              </Button>
            </Link>
          </div>
        }
      />

      <AsyncBoundary state={state}>
        {({ overview, inScopeStaff, feedbackList, kpis }) => {
          const inScopeIds = new Set(inScopeStaff.map((s) => s.id));
          const filteredStaffPerformance = overview?.staff?.filter((s) => inScopeIds.has(s.staffId)) || [];
          
          const awaitingResponseCount = feedbackList.filter(
            (f) => !f.acknowledgedAt && f.status !== 'completed',
          ).length;

          return (
            <div className="space-y-6">
              {/* Top Metrics Row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Staff in Scope"
                  value={inScopeStaff.length}
                  icon={Users}
                  meta="Assigned by Branch Administrator"
                />
                <StatCard
                  label="Average KPI Progress"
                  value={overview?.averagePercent != null ? formatPercent(overview.averagePercent) : 'N/A'}
                  icon={TrendingUp}
                  meta={overview ? `${overview.statusBreakdown?.on_target || 0} on target` : 'Loading'}
                />
                <StatCard
                  label="Active Coaching Notes"
                  value={feedbackList.length}
                  icon={MessageSquareText}
                  meta="Dispatched guidance & evaluations"
                />
                <StatCard
                  label="Awaiting Response"
                  value={awaitingResponseCount}
                  icon={Clock}
                  meta="Pending staff acknowledgment"
                />
              </div>

              {/* Period Selector Bar */}
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-900 block">Performance Reporting Period</span>
                  <span className="text-[11px] text-zinc-500">Filter performance indicators for your supervised staff</span>
                </div>
                <PeriodSelector
                  period={periodState.period}
                  date={periodState.date}
                  onChange={(next) => setPeriodState(next)}
                />
              </div>

              {/* Performance Table within Scope */}
              <Card>
                <CardHeader
                  title="Supervised Staff Performance"
                  description="Real-time KPI progress and compliance for employees within your permitted scope."
                  actions={
                    <span className="text-xs text-zinc-500 font-medium">
                      {filteredStaffPerformance.length} of {inScopeStaff.length} reporting
                    </span>
                  }
                />
                <CardBody className="p-0">
                  {filteredStaffPerformance.length > 0 ? (
                    <StaffPerformanceTable rows={filteredStaffPerformance} />
                  ) : (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No KPI entries recorded by staff in your scope for this period.
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Coaching Follow-up Tracker Card */}
              <Card>
                <CardHeader
                  title="Coaching & Follow-Up Tracker"
                  description="Track action plans, target dates, and employee acknowledgments for continuous improvement."
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFeedbackTargetStaffId(undefined);
                        setGiveFeedbackOpen(true);
                      }}
                      leftIcon={<Plus className="size-3.5" />}
                    >
                      New Note
                    </Button>
                  }
                />
                <CardBody className="p-0">
                  {feedbackList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No feedback or coaching records have been created yet.
                    </div>
                  ) : (
                    <Table>
                      <THead>
                        <TR>
                          <TH>Staff Recipient</TH>
                          <TH>Subject / Area</TH>
                          <TH>Suggested Action</TH>
                          <TH>Target Date</TH>
                          <TH>Acknowledgment</TH>
                          <TH>Staff Response</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {feedbackList.map((item) => (
                          <TR key={item.id} interactive>
                            <TD>
                              <div className="font-semibold text-zinc-900 text-xs">{item.staffName}</div>
                              <div className="text-[11px] text-zinc-400">{item.position || 'Staff'}</div>
                            </TD>
                            <TD>
                              <div className="text-xs font-medium text-zinc-800">{item.subject}</div>
                              <div className="text-[11px] text-zinc-400 line-clamp-1">{item.message}</div>
                            </TD>
                            <TD className="text-xs text-zinc-600 max-w-xs">
                              {item.suggestedAction || <span className="text-zinc-400 italic">None specified</span>}
                            </TD>
                            <TD className="text-xs text-zinc-500 whitespace-nowrap">
                              {item.followUpDate ? formatDate(item.followUpDate) : '—'}
                            </TD>
                            <TD>
                              {item.acknowledgedAt ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                  Acknowledged
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <Clock className="size-3 text-amber-600" />
                                  Pending
                                </span>
                              )}
                            </TD>
                            <TD className="text-xs text-zinc-700 max-w-xs">
                              {item.staffReply ? (
                                <span className="line-clamp-2 text-zinc-800 bg-zinc-50 p-1 rounded border border-zinc-200">
                                  {item.staffReply}
                                </span>
                              ) : (
                                <span className="text-zinc-400 italic">Awaiting response</span>
                              )}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </CardBody>
              </Card>

              {/* Give Feedback Dialog */}
              <GiveFeedbackDialog
                open={giveFeedbackOpen}
                onClose={() => setGiveFeedbackOpen(false)}
                staffList={inScopeStaff}
                kpis={kpis}
                defaultStaffId={feedbackTargetStaffId}
                defaultPeriod={periodState.period}
                onSubmit={handleCreateFeedback}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
