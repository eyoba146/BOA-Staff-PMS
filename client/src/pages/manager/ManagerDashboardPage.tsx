import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  ArrowRight,
  Target,
  Megaphone,
} from 'lucide-react';
import { performanceService } from '@/services/performance.service';
import { useAsync } from '@/hooks/useAsync';
import { todayISO } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import { paths } from '@/routes/paths';
import type { PerformancePeriod } from '@/types';
import { PageHeader, StatCard, PeriodSelector, PendingValidationNotice, AsyncBoundary } from '@/components/shared';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { StatusBreakdown } from '@/components/dashboard/StatusBreakdown';
import { AttentionList } from '@/components/dashboard/AttentionList';
import { StaffPerformanceTable } from '@/components/performance/StaffPerformanceTable';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';

export function ManagerDashboardPage() {
  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'daily',
    date: todayISO(),
  });

  const loadData = useCallback(async () => {
    return performanceService.getBranchOverview(periodState.period, periodState.date);
  }, [periodState.period, periodState.date]);

  const state = useAsync(loadData, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Performance Dashboard"
        description="Comprehensive daily, weekly, monthly, and quarterly branch staff performance overview."
        documentTitle="Branch Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={paths.manager.announcements} className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto" leftIcon={<Megaphone className="size-3.5" />}>
                Post Announcement
              </Button>
            </Link>
            <Link to={paths.manager.performance} className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" rightIcon={<ArrowRight className="size-3.5" />}>
                Detailed Monitoring
              </Button>
            </Link>
            <Link to={paths.manager.kpis} className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" leftIcon={<Target className="size-3.5" />}>
                Manage KPIs
              </Button>
            </Link>
          </div>
        }
      />

      {/* Period Selection */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PeriodSelector
          period={periodState.period}
          date={periodState.date}
          onChange={setPeriodState}
        />
      </div>

      <AsyncBoundary state={state}>
        {(overview) => {
          const totalStaffInPeriod = Object.values(overview.statusBreakdown).reduce((a, b) => a + b, 0);

          return (
            <div className="space-y-6">
              {/* Notice regarding demonstration calculation */}
              <PendingValidationNotice basis={overview.calculationBasis} />

              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
                <StatCard
                  label="Branch Average"
                  value={formatPercent(overview.averagePercent)}
                  meta={`Aggregated ${overview.periodLabel}`}
                  icon={TrendingUp}
                />
                <StatCard
                  label="Today's KPI Entries"
                  value={`${overview.entriesToday} / ${overview.expectedEntriesToday}`}
                  meta={
                    overview.entriesToday >= overview.expectedEntriesToday
                      ? 'All expected entries submitted'
                      : `${overview.expectedEntriesToday - overview.entriesToday} pending entry`
                  }
                  icon={CheckCircle2}
                />
                <StatCard
                  label="Active Staff"
                  value={overview.activeStaff}
                  meta="Enrolled branch personnel"
                  icon={Users}
                />
                <StatCard
                  label="Pending Approvals"
                  value={overview.pendingApprovals}
                  meta={
                    overview.pendingApprovals > 0 ? (
                      <Link to={`${paths.manager.staff}?tab=pending`} className="font-semibold text-gold-700 underline">
                        Review staff applications
                      </Link>
                    ) : (
                      'No pending registrations'
                    )
                  }
                  icon={UserCheck}
                />
              </div>

              {/* Executive Pending Approvals Alert Banner */}
              {overview.pendingApprovals > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/15 via-amber-50/70 to-white p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-ink-950 shadow-md">
                      <UserCheck className="size-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-ink-950">
                          {overview.pendingApprovals} Staff Registration{overview.pendingApprovals > 1 ? 's' : ''} Awaiting Clearance
                        </h4>
                        <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-extrabold text-ink-950 animate-pulse">
                          Action Required
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        Applicants have completed email verification and are waiting for official Employee ID provisioning.
                      </p>
                    </div>
                  </div>
                  <Link to={`${paths.manager.staff}?tab=pending`}>
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="size-3.5" />} className="font-bold shrink-0">
                      Clear Applications
                    </Button>
                  </Link>
                </div>
              )}

              {/* Main Content Grid: Trend + Attention & Breakdown */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* 2 Cols: Trend Chart */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader
                      title="Branch Performance Trend"
                      description={`Historical branch achievement trend (${overview.periodLabel})`}
                    />
                    <CardBody>
                      <TrendChart data={overview.trend} />
                    </CardBody>
                  </Card>

                  {/* Staff Performance Overview Table */}
                  <Card>
                    <CardHeader
                      title="Staff Performance Summary"
                      description={`Staff scores for ${overview.periodLabel}`}
                      actions={
                        <Link to={paths.manager.performance}>
                          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                            View All Staff
                          </Button>
                        </Link>
                      }
                    />
                    <StaffPerformanceTable rows={overview.staff.slice(0, 5)} />
                  </Card>
                </div>

                {/* 1 Col: Status Breakdown & Immediate Attention Items */}
                <div className="space-y-6 lg:col-span-1">
                  {/* Status Distribution */}
                  <Card>
                    <CardHeader
                      title="Status Distribution"
                      description="Breakdown of staff performance ratings"
                    />
                    <CardBody>
                      <StatusBreakdown
                        breakdown={overview.statusBreakdown}
                        total={totalStaffInPeriod}
                      />
                    </CardBody>
                  </Card>

                  {/* Attention Items */}
                  <Card>
                    <CardHeader
                      title="Requires Attention"
                      description="Items requiring immediate manager action"
                    />
                    <CardBody>
                      <AttentionList items={overview.attentionItems} />
                    </CardBody>
                  </Card>
                </div>
              </div>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
