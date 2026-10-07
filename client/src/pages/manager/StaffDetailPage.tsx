import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquareText,
  UserX,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  Mail,
  Phone,
} from 'lucide-react';
import { staffService } from '@/services/staff.service';
import { performanceService } from '@/services/performance.service';
import { feedbackService } from '@/services/feedback.service';
import { kpiService } from '@/services/kpi.service';
import { kpiEntryService } from '@/services/kpiEntry.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { paths } from '@/routes/paths';
import { todayISO, formatDate, formatDateTime } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import type { PerformancePeriod, FeedbackInput } from '@/types';
import {
  StatCard,
  PeriodSelector,
  PendingValidationNotice,
  AsyncBoundary,
  ConfirmDialog,
} from '@/components/shared';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { KpiResultsTable } from '@/components/kpi/KpiResultsTable';
import { GiveFeedbackDialog } from '@/components/feedback/GiveFeedbackDialog';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Avatar,
  AccountStatusBadge,
  PerformanceStatusBadge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from '@/components/ui';

export function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const { showToast } = useToast();

  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'daily',
    date: todayISO(),
  });

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    if (!staffId) throw new Error('Missing staff identifier');

    const [staff, summary, trend, feedbackList, allKpis, recentEntries] = await Promise.all([
      staffService.getById(staffId),
      performanceService.getStaffSummary(staffId, periodState.period, periodState.date),
      performanceService.getStaffTrend(staffId, periodState.period, periodState.date),
      feedbackService.list({ staffId }),
      kpiService.list({ status: 'active' }),
      kpiEntryService.listForStaff(staffId),
    ]);

    if (!staff) throw new Error('Staff member not found');

    return { staff, summary, trend, feedbackList, allKpis, recentEntries };
  }, [staffId, periodState.period, periodState.date]);

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
      showToast({ tone: 'success', title: 'Feedback sent', message: 'Performance feedback successfully delivered.' });
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Failed', message: 'Could not submit feedback.' });
    }
  };

  const handleToggleStatus = async () => {
    if (!state.data?.staff) return;
    const current = state.data.staff;
    const nextStatus = current.status === 'active' ? 'deactivated' : 'active';
    setUpdatingStatus(true);
    try {
      await staffService.setStatus(current.id, nextStatus);
      showToast({
        tone: 'neutral',
        title: 'Account status updated',
        message: `${current.fullName}'s account is now ${nextStatus}.`,
      });
      setStatusConfirmOpen(false);
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Action failed', message: 'Could not change account status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to={paths.manager.staff}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Staff Management
        </Link>
      </div>

      <AsyncBoundary state={state}>
        {({ staff, summary, trend, feedbackList, allKpis, recentEntries }) => {
          const isActive = staff.status === 'active';

          return (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
                <div className="flex items-center gap-4">
                  <Avatar name={staff.fullName} src={staff.avatarUrl} size="lg" className="size-16 text-lg" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-zinc-900">{staff.fullName}</h2>
                      <AccountStatusBadge status={staff.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {staff.employeeId} · {staff.position} · {staff.branchName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3 text-zinc-400" /> {staff.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-zinc-400" /> {staff.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<MessageSquareText className="size-4" />}
                    onClick={() => setFeedbackDialogOpen(true)}
                  >
                    Give Feedback
                  </Button>
                  <Button
                    variant={isActive ? 'danger' : 'secondary'}
                    size="sm"
                    leftIcon={isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                    onClick={() => setStatusConfirmOpen(true)}
                  >
                    {isActive ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </div>

              {/* Period selection */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <PeriodSelector
                  period={periodState.period}
                  date={periodState.date}
                  onChange={setPeriodState}
                />
              </div>

              <PendingValidationNotice basis={summary.calculationBasis} />

              {/* Summary Stats Row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Overall Performance"
                  value={formatPercent(summary.overallPercent)}
                  meta={summary.periodLabel}
                  icon={TrendingUp}
                />
                <StatCard
                  label="Submissions"
                  value={`${summary.entriesSubmitted} / ${summary.entriesExpected}`}
                  meta={
                    summary.entriesSubmitted >= summary.entriesExpected
                      ? 'All expected submissions complete'
                      : 'Pending periodic entries'
                  }
                  icon={CheckCircle2}
                />
                <StatCard
                  label="Calculated Status"
                  value={
                    <div className="pt-1">
                      <PerformanceStatusBadge status={summary.status} />
                    </div>
                  }
                  meta="Based on approved branch benchmarks"
                />
              </div>

              {/* Trend Chart */}
              <Card>
                <CardHeader
                  title="Individual Performance Trend"
                  description={`Historical trend for ${staff.fullName} across ${summary.periodLabel}`}
                />
                <CardBody>
                  <TrendChart data={trend} />
                </CardBody>
              </Card>

              {/* KPI Results for Period */}
              <Card>
                <CardHeader
                  title="Period KPI Achievements"
                  description={`Actual vs target breakdown for ${summary.periodLabel}`}
                />
                <KpiResultsTable results={summary.kpiResults} />
              </Card>

              {/* Recent KPI Entries History */}
              <Card>
                <CardHeader
                  title="Recent KPI Entries"
                  description="Latest recorded daily achievements and notes"
                />
                {recentEntries.length === 0 ? (
                  <p className="p-6 text-center text-xs text-zinc-500">No recent submissions recorded.</p>
                ) : (
                  <Table caption="Recent entries">
                    <THead>
                      <TR>
                        <TH>Date</TH>
                        <TH>KPI Name</TH>
                        <TH align="right">Target</TH>
                        <TH align="right">Actual</TH>
                        <TH align="right">Score %</TH>
                        <TH align="center">Status</TH>
                        <TH hideBelow="md">Notes</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {recentEntries.slice(0, 10).map((entry) => (
                        <TR key={entry.id}>
                          <TD className="text-xs font-medium text-zinc-900">{formatDate(entry.date)}</TD>
                          <TD className="text-xs font-medium text-zinc-800">
                            {allKpis.find((k) => k.id === entry.kpiId)?.name ?? entry.kpiId}
                          </TD>
                          <TD align="right" className="text-xs text-zinc-500 tabular">
                            {entry.target}
                          </TD>
                          <TD align="right" className="text-xs font-semibold text-zinc-900 tabular">
                            {entry.actual}
                          </TD>
                          <TD align="right" className="text-xs font-semibold tabular">
                            {formatPercent(entry.performancePercent)}
                          </TD>
                          <TD align="center">
                            <PerformanceStatusBadge status={entry.status} />
                          </TD>
                          <TD hideBelow="md" className="text-xs text-zinc-500 italic">
                            {entry.note || '—'}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </Card>

              {/* Feedback History */}
              <Card>
                <CardHeader
                  title="Management Feedback History"
                  description={`Feedback notes provided to ${staff.fullName}`}
                />
                <CardBody>
                  {feedbackList.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">No feedback records found for this employee.</p>
                  ) : (
                    <div className="space-y-3">
                      {feedbackList.map((fb) => (
                        <div key={fb.id} className="rounded-md border border-zinc-200 bg-zinc-50/50 p-4 text-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-200/60 pb-2">
                            <span className="font-semibold text-zinc-900">{fb.subject}</span>
                            <span className="text-[11px] text-zinc-400">{formatDateTime(fb.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-zinc-700 leading-relaxed whitespace-pre-line">{fb.message}</p>
                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-200/40 text-[11px] text-zinc-400">
                            <span>By: {fb.managerName}</span>
                            <span>{fb.readAt ? `Read on ${formatDate(fb.readAt)}` : 'Unread by staff'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Modals */}
              <GiveFeedbackDialog
                open={feedbackDialogOpen}
                onClose={() => setFeedbackDialogOpen(false)}
                staffList={[staff]}
                kpis={allKpis}
                defaultStaffId={staff.id}
                defaultPeriod={periodState.period}
                defaultPeriodLabel={summary.periodLabel}
                onSubmit={handleGiveFeedback}
              />

              <ConfirmDialog
                open={statusConfirmOpen}
                onCancel={() => setStatusConfirmOpen(false)}
                onConfirm={handleToggleStatus}
                title={isActive ? 'Deactivate Staff Account' : 'Reactivate Staff Account'}
                description={`Are you sure you want to ${isActive ? 'deactivate' : 'reactivate'} ${staff.fullName}'s account? ${
                  isActive ? 'They will no longer be able to log in or record KPI entries.' : 'Access will be restored.'
                }`}
                confirmLabel={isActive ? 'Deactivate Account' : 'Reactivate Account'}
                destructive={isActive}
                loading={updatingStatus}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
