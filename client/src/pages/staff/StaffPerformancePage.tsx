import { useState, useCallback } from 'react';
import { TrendingUp, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { performanceService } from '@/services/performance.service';
import { todayISO } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import type { PerformancePeriod } from '@/types';
import { PageHeader, PeriodSelector, StatCard, PendingValidationNotice, AsyncBoundary } from '@/components/shared';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { KpiResultsTable } from '@/components/kpi/KpiResultsTable';
import { Card, CardHeader, CardBody, PerformanceStatusBadge } from '@/components/ui';

export function StaffPerformancePage() {
  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'monthly',
    date: todayISO(),
  });

  const loadData = useCallback(async () => {
    const [summary, trend] = await Promise.all([
      performanceService.getMySummary(periodState.period, periodState.date),
      performanceService.getMyTrend(periodState.period, periodState.date),
    ]);
    return { summary, trend };
  }, [periodState.period, periodState.date]);

  const state = useAsync(loadData, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance"
        description="Comprehensive evaluation across daily, weekly, monthly, and quarterly intervals."
        documentTitle="My Performance"
        actions={
          <PeriodSelector
            period={periodState.period}
            date={periodState.date}
            onChange={setPeriodState}
          />
        }
      />

      <AsyncBoundary state={state}>
        {({ summary, trend }) => (
          <div className="space-y-6">
            <PendingValidationNotice basis={summary.calculationBasis} />

            {/* Performance Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
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
                label="Submission Integrity"
                value={`${summary.entriesSubmitted} / ${summary.entriesExpected}`}
                icon={ClipboardCheck}
                meta={<span className="text-xs text-zinc-500">Recorded vs expected entries</span>}
              />
              <StatCard
                label="Evaluated Indicators"
                value={summary.kpiResults.length}
                icon={CheckCircle2}
                meta={<span className="text-xs text-zinc-500">Active assigned KPIs in period</span>}
              />
            </div>

            {/* Performance Trend Chart */}
            <Card>
              <CardHeader
                title="Performance Trajectory"
                description={`Historical performance curve across consecutive ${periodState.period} evaluation cycles.`}
              />
              <CardBody>
                <TrendChart data={trend} height={260} />
              </CardBody>
            </Card>

            {/* Per-KPI Breakdown Table */}
            <Card>
              <CardHeader
                title="Indicator Results Breakdown"
                description={`Detailed actual vs target performance metrics for ${summary.periodLabel}.`}
              />
              <KpiResultsTable results={summary.kpiResults} />
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
