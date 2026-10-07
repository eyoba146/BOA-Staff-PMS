import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardPenLine,
  TrendingUp,
  MessageSquareText,
  Megaphone,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useCurrentUser } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { performanceService } from '@/services/performance.service';
import { feedbackService } from '@/services/feedback.service';
import { announcementService } from '@/services/announcement.service';
import { kpiService } from '@/services/kpi.service';
import { todayISO, formatDate } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import { paths } from '@/routes/paths';
import type { PerformancePeriod } from '@/types';
import { PageHeader, StatCard, PeriodSelector, PendingValidationNotice, AsyncBoundary } from '@/components/shared';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { Card, CardHeader, CardBody, Button, PerformanceStatusBadge, Badge, ProgressBar } from '@/components/ui';

export function StaffDashboardPage() {
  const user = useCurrentUser();
  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'daily',
    date: todayISO(),
  });

  const loadData = useCallback(async () => {
    const [summary, trend, feedbackList, announcementsList, assignedKpis] = await Promise.all([
      performanceService.getMySummary(periodState.period, periodState.date),
      performanceService.getMyTrend(periodState.period, periodState.date),
      feedbackService.listMine(),
      announcementService.list(),
      kpiService.getMyAssignedKpis(todayISO()),
    ]);

    const todaySubmittedCount = assignedKpis.filter((k) => k.entry !== null).length;
    const isTodayComplete = assignedKpis.length > 0 && todaySubmittedCount === assignedKpis.length;

    return {
      summary,
      trend,
      feedbackList: feedbackList.slice(0, 3),
      unreadFeedbackCount: feedbackList.filter((f) => !f.readAt).length,
      announcementsList: announcementsList.slice(0, 3),
      assignedKpis,
      todaySubmittedCount,
      isTodayComplete,
    };
  }, [periodState.period, periodState.date]);

  const state = useAsync(loadData, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.fullName.split(' ')[0]}`}
        description={`${user.position} · ${user.branchName}`}
        documentTitle="Staff Dashboard"
        actions={
          <PeriodSelector
            period={periodState.period}
            date={periodState.date}
            onChange={setPeriodState}
          />
        }
      />

      <AsyncBoundary state={state}>
        {(data) => {
          const { summary, trend, feedbackList, unreadFeedbackCount, announcementsList, assignedKpis, todaySubmittedCount, isTodayComplete } = data;

          return (
            <div className="space-y-6">
              {/* Daily Entry Status Callout */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        isTodayComplete
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gold-50 text-gold-800 border border-gold-200'
                      }`}
                    >
                      {isTodayComplete ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">
                        {isTodayComplete ? "Today's KPI Entries Recorded" : "Today's KPI Entry Pending"}
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDate(todayISO(), 'long')} — {todaySubmittedCount} of {assignedKpis.length} assigned indicators submitted.
                      </p>
                    </div>
                  </div>

                  <Link to={paths.staff.kpiEntry}>
                    <Button
                      variant={isTodayComplete ? 'secondary' : 'accent'}
                      size="md"
                      leftIcon={<ClipboardPenLine className="size-4" />}
                      rightIcon={<ArrowRight className="size-4" />}
                    >
                      {isTodayComplete ? 'Review / Update Entry' : 'Record Daily Entry'}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Notice regarding demonstration calculation basis */}
              <PendingValidationNotice basis={summary.calculationBasis} />

              {/* KPI Stat Row */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Performance Achievement"
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
                  meta={<span className="text-xs text-zinc-500">Required entries for period</span>}
                />
                <StatCard
                  label="Assigned Indicators"
                  value={summary.kpiResults.length}
                  meta={<span className="text-xs text-zinc-500">Active assigned KPIs</span>}
                />
                <StatCard
                  label="Management Feedback"
                  value={unreadFeedbackCount > 0 ? `${unreadFeedbackCount} Unread` : 'All read'}
                  icon={MessageSquareText}
                  meta={
                    <Link to={paths.staff.feedback} className="text-xs text-zinc-900 font-medium underline underline-offset-2">
                      View all feedback
                    </Link>
                  }
                />
              </div>

              {/* Trend Chart (2/3) + Assigned Indicators Breakdown (1/3) */}
              <div className="grid gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader
                    title="Performance Trend"
                    description={`Historical trajectory over recent ${periodState.period} periods.`}
                  />
                  <CardBody>
                    <TrendChart data={trend} height={260} />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="Current Indicators"
                    description={`Results for ${summary.periodLabel}`}
                  />
                  <CardBody className="space-y-4">
                    {summary.kpiResults.length === 0 ? (
                      <p className="text-xs text-zinc-500">No KPIs assigned for this period.</p>
                    ) : (
                      summary.kpiResults.map((r) => (
                        <div key={r.kpiId} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-800 truncate">{r.kpiName}</span>
                            <span className="font-semibold text-zinc-900 tabular">
                              {formatPercent(r.performancePercent)}
                            </span>
                          </div>
                          <ProgressBar percent={r.performancePercent} status={r.status} label={r.kpiName} />
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Bottom split: Recent Feedback & Announcements */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Feedback */}
                <Card>
                  <CardHeader
                    title="Recent Management Feedback"
                    icon={<MessageSquareText />}
                    actions={
                      <Link to={paths.staff.feedback} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                        View all
                      </Link>
                    }
                  />
                  <CardBody className="space-y-3">
                    {feedbackList.length === 0 ? (
                      <p className="text-xs text-zinc-500">No management feedback received yet.</p>
                    ) : (
                      feedbackList.map((f) => (
                        <div key={f.id} className="rounded-md border border-zinc-100 bg-zinc-50/60 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-900">{f.subject}</span>
                            {!f.readAt && <Badge tone="gold">New</Badge>}
                          </div>
                          <p className="mt-1 text-zinc-600 line-clamp-2">{f.message}</p>
                          <div className="mt-2 text-[11px] text-zinc-400">
                            From {f.managerName} · {formatDate(f.createdAt, 'short')}
                          </div>
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>

                {/* Announcements */}
                <Card>
                  <CardHeader
                    title="Branch Announcements"
                    icon={<Megaphone />}
                    actions={
                      <Link to={paths.staff.announcements} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                        View all
                      </Link>
                    }
                  />
                  <CardBody className="space-y-3">
                    {announcementsList.length === 0 ? (
                      <p className="text-xs text-zinc-500">No branch announcements posted.</p>
                    ) : (
                      announcementsList.map((a) => (
                        <div key={a.id} className="rounded-md border border-zinc-100 bg-zinc-50/60 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-900">{a.title}</span>
                            <Badge tone="neutral">{a.category}</Badge>
                          </div>
                          <p className="mt-1 text-zinc-600 line-clamp-2">{a.body}</p>
                          <div className="mt-2 text-[11px] text-zinc-400">
                            {formatDate(a.publishedAt ?? a.createdAt, 'short')}
                          </div>
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>
              </div>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
