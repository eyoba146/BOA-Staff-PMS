import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  ArrowRight,
  Target,
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
            <Link to={paths.manager.performance}>
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                Detailed Monitoring
              </Button>
            </Link>
            <Link to={paths.manager.kpis}>
              <Button variant="secondary" size="sm" leftIcon={<Target className="size-3.5" />}>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      <Link to={paths.manager.staff} className="font-semibold text-gold-700 underline">
                        Review staff applications
                      </Link>
                    ) : (
                      'No pending registrations'
                    )
                  }
                  icon={UserCheck}
                />
              </div>

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
