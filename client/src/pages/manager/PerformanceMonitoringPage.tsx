import { useState, useCallback } from 'react';
import { Search, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { performanceService } from '@/services/performance.service';
import { useAsync } from '@/hooks/useAsync';
import { todayISO } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import type { PerformancePeriod } from '@/types';
import {
  PageHeader,
  StatCard,
  PeriodSelector,
  PendingValidationNotice,
  AsyncBoundary,
} from '@/components/shared';
import { StaffPerformanceTable } from '@/components/performance/StaffPerformanceTable';
import { Card, CardHeader, Input, Select } from '@/components/ui';

export function PerformanceMonitoringPage() {
  const [periodState, setPeriodState] = useState<{ period: PerformancePeriod; date: string }>({
    period: 'daily',
    date: todayISO(),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    return performanceService.getBranchOverview(periodState.period, periodState.date);
  }, [periodState.period, periodState.date]);

  const state = useAsync(loadData, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Monitoring"
        description="Monitor staff achievements and completion rates across daily, weekly, monthly, and quarterly review cycles."
        documentTitle="Performance Monitoring"
      />

      {/* Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PeriodSelector
          period={periodState.period}
          date={periodState.date}
          onChange={setPeriodState}
        />
      </div>

      <AsyncBoundary state={state}>
        {(overview) => {
          const filteredStaff = overview.staff.filter((row) => {
            const matchesSearch =
              row.fullName.toLowerCase().includes(search.toLowerCase()) ||
              row.employeeId.toLowerCase().includes(search.toLowerCase()) ||
              row.position.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
            return matchesSearch && matchesStatus;
          });

          return (
            <div className="space-y-6">
              <PendingValidationNotice basis={overview.calculationBasis} />

              {/* Summary Strip */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Branch Average Score"
                  value={formatPercent(overview.averagePercent)}
                  meta={overview.periodLabel}
                  icon={TrendingUp}
                />
                <StatCard
                  label="Total Evaluated Staff"
                  value={overview.staff.length}
                  meta="Personnel in roster"
                  icon={Users}
                />
                <StatCard
                  label="On Target"
                  value={overview.statusBreakdown.on_target || 0}
                  meta="Meeting benchmarks"
                  icon={CheckCircle2}
                />
                <StatCard
                  label="Needs Attention / Below"
                  value={
                    (overview.statusBreakdown.needs_attention || 0) +
                    (overview.statusBreakdown.below_target || 0)
                  }
                  meta="Requiring follow-up"
                />
              </div>

              {/* Filter controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search staff by name or position..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Filter Status:</span>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-44"
                  >
                    <option value="all">All statuses</option>
                    <option value="on_target">On Target</option>
                    <option value="needs_attention">Needs Attention</option>
                    <option value="below_target">Below Target</option>
                    <option value="not_submitted">Not Submitted</option>
                    <option value="unrated">Unrated</option>
                  </Select>
                </div>
              </div>

              {/* Staff Performance Table */}
              <Card>
                <CardHeader
                  title={`Staff Performance Rankings (${overview.periodLabel})`}
                  description="Click on any staff member row to open their full performance history and give feedback."
                />
                <StaffPerformanceTable rows={filteredStaff} />
              </Card>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
