import { useState, useCallback } from 'react';
import {
  Download,
  Calendar,
  Users,
  Target,
} from 'lucide-react';
import { performanceService } from '@/services/performance.service';
import { useAsync } from '@/hooks/useAsync';
import { todayISO, addDays, formatDate } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import type { PerformancePeriod } from '@/types';
import { PageHeader, PendingValidationNotice, AsyncBoundary } from '@/components/shared';
import { StaffPerformanceTable } from '@/components/performance/StaffPerformanceTable';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  PerformanceStatusBadge,
  ProgressBar,
} from '@/components/ui';

export function ReportsPage() {
  const [period, setPeriod] = useState<PerformancePeriod>('monthly');
  const [fromDate, setFromDate] = useState(() => addDays(todayISO(), -30));
  const [toDate, setToDate] = useState(() => todayISO());
  const [activeReportTab, setActiveReportTab] = useState<'staff' | 'kpi'>('staff');

  const loadReport = useCallback(async () => {
    return performanceService.getReport(period, fromDate, toDate);
  }, [period, fromDate, toDate]);

  const state = useAsync(loadReport, [loadReport]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Reports"
        description="Consolidated branch reporting and performance audits aggregated by staff and Key Performance Indicator."
        documentTitle="Performance Reports"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="size-4" />}
            disabled
            title="Export functionality scheduled for phase 2 (PDF / Excel)"
          >
            Export Report (Planned)
          </Button>
        }
      />

      {/* Report Filter Controls */}
      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="Cycle Period" className="w-40">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PerformancePeriod)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </Field>

          <Field label="From Date" className="w-44">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              leftIcon={<Calendar className="size-4 text-zinc-400" />}
            />
          </Field>

          <Field label="To Date" className="w-44">
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              leftIcon={<Calendar className="size-4 text-zinc-400" />}
            />
          </Field>

          <div className="text-xs text-zinc-500 pb-2">
            Coverage: {formatDate(fromDate)} – {formatDate(toDate)}
          </div>
        </CardBody>
      </Card>

      <AsyncBoundary state={state}>
        {(report) => (
          <div className="space-y-6">
            <PendingValidationNotice basis={report.calculationBasis} />

            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-200">
              <button
                type="button"
                onClick={() => setActiveReportTab('staff')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeReportTab === 'staff'
                    ? 'border-ink-900 text-ink-900'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
              >
                <Users className="size-4" />
                Performance by Staff ({report.byStaff.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveReportTab('kpi')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeReportTab === 'kpi'
                    ? 'border-ink-900 text-ink-900'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
              >
                <Target className="size-4" />
                Performance by Indicator ({report.byKpi.length})
              </button>
            </div>

            {activeReportTab === 'staff' ? (
              <Card>
                <CardHeader
                  title="Staff Performance Breakdown"
                  description={`Aggregated staff results for the period ${formatDate(report.from)} to ${formatDate(report.to)}`}
                />
                <StaffPerformanceTable rows={report.byStaff} />
              </Card>
            ) : (
              <Card>
                <CardHeader
                  title="KPI Summary Breakdown"
                  description="Branch-wide aggregated results for each active indicator"
                />
                {report.byKpi.length === 0 ? (
                  <p className="p-6 text-center text-xs text-zinc-500">No KPI activity found in this date range.</p>
                ) : (
                  <Table caption="Performance by KPI">
                    <THead>
                      <TR>
                        <TH>Indicator Name</TH>
                        <TH align="center">Unit</TH>
                        <TH align="center">Assigned Staff</TH>
                        <TH align="center">Entries</TH>
                        <TH hideBelow="sm" className="w-36">Progress</TH>
                        <TH align="right">Avg Score %</TH>
                        <TH align="center">Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {report.byKpi.map((kpi) => (
                        <TR key={kpi.kpiId}>
                          <TD className="font-semibold text-zinc-900">{kpi.kpiName}</TD>
                          <TD align="center" className="text-xs text-zinc-500">{kpi.unit}</TD>
                          <TD align="center" className="text-xs text-zinc-700">{kpi.assignedStaff}</TD>
                          <TD align="center" className="text-xs text-zinc-700 tabular">{kpi.entries}</TD>
                          <TD hideBelow="sm">
                            <ProgressBar
                              percent={kpi.averagePercent}
                              status={kpi.status}
                              label={kpi.kpiName}
                            />
                          </TD>
                          <TD align="right" className="font-semibold text-zinc-900 tabular">
                            {formatPercent(kpi.averagePercent)}
                          </TD>
                          <TD align="center">
                            <PerformanceStatusBadge status={kpi.status} />
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
