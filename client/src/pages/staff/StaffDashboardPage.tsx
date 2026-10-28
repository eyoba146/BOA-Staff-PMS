import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPenLine,
  Clock,
  Megaphone,
  MessageSquareText,
  TrendingUp,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { useCurrentUser } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { performanceService } from '@/services/performance.service';
import { feedbackService } from '@/services/feedback.service';
import { announcementService } from '@/services/announcement.service';
import { instructionService } from '@/services/instruction.service';
import { kpiService } from '@/services/kpi.service';
import { todayISO, formatDate } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import { paths } from '@/routes/paths';
import type { PerformancePeriod } from '@/types';
import {
  PageHeader,
  StatCard,
  PeriodSelector,
  PendingValidationNotice,
  AsyncBoundary,
} from '@/components/shared';
import { TrendChart } from '@/components/dashboard/TrendChart';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  PerformanceStatusBadge,
  Badge,
  ProgressBar,
} from '@/components/ui';

interface SupportingData {
  feedbackList: Awaited<ReturnType<typeof feedbackService.listMine>>;
  announcementsList: Awaited<ReturnType<typeof announcementService.list>>;
  instructionsList: Awaited<ReturnType<typeof instructionService.list>>;
  assignedKpis: Awaited<ReturnType<typeof kpiService.getMyAssignedKpis>>;
  todaySubmittedCount: number;
  isTodayComplete: boolean;
  unreadFeedbackCount: number;
}

export function StaffDashboardPage() {
  const user = useCurrentUser();
  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'daily',
    date: todayISO(),
  });

  const loadPerformance = useCallback(
    () => performanceService.getMyDashboard(periodState.period, periodState.date),
    [periodState.period, periodState.date],
  );
  const performanceState = useAsync(loadPerformance, [loadPerformance]);

  const loadSupporting = useCallback(async (): Promise<SupportingData> => {
    const [feedbackList, announcementsList, assignedKpis, instructionsList] = await Promise.all([
      feedbackService.listMine(),
      announcementService.list(),
      kpiService.getMyAssignedKpis(todayISO()),
      instructionService.list().catch(() => []),
    ]);
    const todaySubmittedCount = assignedKpis.filter((kpi) => kpi.entry !== null).length;
    return {
      feedbackList: feedbackList.slice(0, 3),
      unreadFeedbackCount: feedbackList.filter((feedback) => !feedback.readAt).length,
      announcementsList: announcementsList.slice(0, 3),
      instructionsList: instructionsList.slice(0, 3),
      assignedKpis,
      todaySubmittedCount,
      isTodayComplete: assignedKpis.length > 0 && todaySubmittedCount === assignedKpis.length,
    };
  }, []);
  const supportingState = useAsync(loadSupporting, [loadSupporting]);

  const supportingData = supportingState.data;

  return (
    <div className="space-y-6">
      {/* 1. Header with greeting, date, role, branch, and period selector */}
      <PageHeader
        title={`Welcome back, ${user.fullName.split(' ')[0]}`}
        description={`${formatDate(todayISO(), 'long')} · ${user.position} · ${user.branchName}`}
        documentTitle="Staff Dashboard"
        actions={
          <PeriodSelector
            period={periodState.period}
            date={periodState.date}
            onChange={setPeriodState}
          />
        }
      />

      {/* 2. Today's KPI Entry Callout Banner (status + CTA) */}
      {supportingData && (
        <div
          className={`rounded-xl border p-4.5 sm:p-5 shadow-xs transition-all ${
            supportingData.isTodayComplete
              ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-white'
              : 'border-gold-300/80 bg-gradient-to-r from-gold-50/90 via-amber-50/30 to-white'
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                  supportingData.isTodayComplete
                    ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-300/60'
                    : 'bg-gold-500/20 text-gold-800 border border-gold-300'
                }`}
              >
                {supportingData.isTodayComplete ? (
                  <CheckCircle2 className="size-6 text-emerald-600" />
                ) : (
                  <Clock className="size-6 text-gold-700" />
                )}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-zinc-900">
                    {supportingData.isTodayComplete
                      ? "Today's Operational KPI Entries Recorded"
                      : "Daily KPI Entry Required"}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      supportingData.isTodayComplete
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-gold-100 text-gold-900 border border-gold-300'
                    }`}
                  >
                    {supportingData.todaySubmittedCount} of {supportingData.assignedKpis.length} Submitted
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {supportingData.isTodayComplete
                    ? `All required operational indicators for ${formatDate(todayISO(), 'long')} have been submitted to branch records.`
                    : `Please record your daily figures for ${formatDate(todayISO(), 'long')} before close of operational window.`}
                </p>
              </div>
            </div>
            <Link to={paths.staff.kpiEntry} className="w-full sm:w-auto shrink-0">
              <Button
                variant={supportingData.isTodayComplete ? 'secondary' : 'accent'}
                size="md"
                className="w-full sm:w-auto"
                leftIcon={<ClipboardPenLine className="size-4" />}
                rightIcon={<ArrowRight className="size-4" />}
              >
                {supportingData.isTodayComplete ? 'Review / Update Entry' : 'Record Daily Entry'}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Daily Staff Directives & Instructions */}
      {supportingData && supportingData.instructionsList.length > 0 && (
        <div className="rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-50/40 to-white p-4.5 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-ink-950 font-bold shadow-xs">
                <ClipboardList className="size-5" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 bg-amber-400/30 border border-amber-300/60 px-2 py-0.5 rounded-md">
                    Daily Staff Directive
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDate(supportingData.instructionsList[0].createdAt, 'short')}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-ink-950">
                  {supportingData.instructionsList[0].title}
                </h4>
                <p className="text-xs text-zinc-700 leading-relaxed max-w-2xl line-clamp-2">
                  {supportingData.instructionsList[0].body}
                </p>
                <div className="text-[11px] text-zinc-500 pt-0.5">
                  Issued by <strong className="text-zinc-800">{supportingData.instructionsList[0].authorName}</strong>
                </div>
              </div>
            </div>
            <Link to={paths.staff.instructions} className="shrink-0">
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                View Instructions ({supportingData.instructionsList.length})
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Core Performance Statistics, Trend Chart & KPI Status List */}
      <AsyncBoundary state={performanceState}>
        {({ summary, trend }) => (
          <div className="space-y-6">
            <PendingValidationNotice basis={summary.calculationBasis} />

            {/* Stat Row: Overall %, Status, Entries Submitted/Expected, Unread Feedback */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              <StatCard
                label="Overall Achievement"
                value={formatPercent(summary.overallPercent)}
                icon={TrendingUp}
                meta={
                  <div className="flex items-center gap-2">
                    <PerformanceStatusBadge status={summary.status} />
                    <span className="text-xs text-zinc-400">for {summary.periodLabel}</span>
                  </div>
                }
              />
              <StatCard
                label="Entries Recorded"
                value={`${summary.entriesSubmitted} / ${summary.entriesExpected}`}
                icon={ClipboardPenLine}
                meta={<span className="text-xs text-zinc-500">Submitted entries for period</span>}
              />
              <StatCard
                label="Assigned Indicators"
                value={summary.kpiResults.length}
                icon={Sparkles}
                meta={<span className="text-xs text-zinc-500">Active branch KPI assignments</span>}
              />
              <StatCard
                label="Management Feedback"
                value={
                  supportingData
                    ? supportingData.unreadFeedbackCount > 0
                      ? `${supportingData.unreadFeedbackCount} Unread`
                      : 'All read'
                    : 'Loading...'
                }
                icon={MessageSquareText}
                meta={
                  <Link
                    to={paths.staff.feedback}
                    className="text-xs text-zinc-900 font-medium underline underline-offset-2 hover:text-gold-700"
                  >
                    View feedback history
                  </Link>
                }
              />
            </div>

            {/* Main Visual: Trend Chart (2/3) + KPI Status List (1/3) */}
            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader
                  title="Performance Trajectory & Trend"
                  description={`Historical attainment trajectory over recent ${periodState.period} operational cycles.`}
                />
                <CardBody>
                  <TrendChart data={trend} height={260} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Current Indicators"
                  description={`Attainment results for ${summary.periodLabel}`}
                />
                <CardBody className="space-y-4">
                  {summary.kpiResults.length === 0 ? (
                    <p className="text-xs text-zinc-500">No KPIs assigned for this period.</p>
                  ) : (
                    summary.kpiResults.map((result) => (
                      <div key={result.kpiId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-800 truncate" title={result.kpiName}>
                            {result.kpiName}
                          </span>
                          <span className="font-semibold text-zinc-900 tabular">
                            {formatPercent(result.performancePercent)}
                          </span>
                        </div>
                        <ProgressBar
                          percent={result.performancePercent}
                          status={result.status}
                          label={result.kpiName}
                        />
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>

      {/* 4. Supporting Intelligence: Recent Management Feedback (1/2) + Branch Announcements (1/2) */}
      <AsyncBoundary state={supportingState}>
        {(data) => (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader
                title="Recent Management Feedback"
                icon={<MessageSquareText />}
                actions={
                  <Link
                    to={paths.staff.feedback}
                    className="text-xs font-semibold text-zinc-700 hover:text-zinc-900"
                  >
                    View all
                  </Link>
                }
              />
              <CardBody className="space-y-3">
                {data.feedbackList.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3">No management feedback received yet.</p>
                ) : (
                  data.feedbackList.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs transition-colors hover:border-zinc-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900">{feedback.subject}</span>
                        {!feedback.readAt && <Badge tone="gold">New</Badge>}
                      </div>
                      <p className="mt-1 text-zinc-600 line-clamp-2 leading-relaxed">
                        {feedback.message}
                      </p>
                      <div className="mt-2 text-[11px] text-zinc-400 font-medium">
                        From {feedback.managerName} · {formatDate(feedback.createdAt, 'short')}
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Branch Announcements & Circulars"
                icon={<Megaphone />}
                actions={
                  <Link
                    to={paths.staff.announcements}
                    className="text-xs font-semibold text-zinc-700 hover:text-zinc-900"
                  >
                    View all
                  </Link>
                }
              />
              <CardBody className="space-y-3">
                {data.announcementsList.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3">No branch announcements posted.</p>
                ) : (
                  data.announcementsList.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs transition-colors hover:border-zinc-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 truncate pr-2">
                          {announcement.title}
                        </span>
                        <Badge tone="neutral">{announcement.category}</Badge>
                      </div>
                      <p className="mt-1 text-zinc-600 line-clamp-2 leading-relaxed">
                        {announcement.body}
                      </p>
                      <div className="mt-2 text-[11px] text-zinc-400 font-medium">
                        {formatDate(announcement.publishedAt ?? announcement.createdAt, 'short')}
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
