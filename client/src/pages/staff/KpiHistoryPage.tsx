import { useState, useCallback } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { kpiEntryService } from '@/services/kpiEntry.service';
import { kpiService } from '@/services/kpi.service';
import { todayISO, addDays, formatDate } from '@/utils/date';
import { formatNumber, formatPercent } from '@/utils/format';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { Card, CardBody, Table, THead, TBody, TR, TH, TD, PerformanceStatusBadge, Select, Input, Field, Button, EmptyState } from '@/components/ui';
import { History, FilterX } from 'lucide-react';

export function KpiHistoryPage() {
  const [from, setFrom] = useState(addDays(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [selectedKpiId, setSelectedKpiId] = useState('');

  const loadData = useCallback(async () => {
    const [entries, kpis] = await Promise.all([
      kpiEntryService.listMine({ from, to, kpiId: selectedKpiId || undefined }),
      kpiService.list({ status: 'active' }),
    ]);
    return { entries, kpis };
  }, [from, to, selectedKpiId]);

  const state = useAsync(loadData, [loadData]);

  const resetFilters = () => {
    setFrom(addDays(todayISO(), -30));
    setTo(todayISO());
    setSelectedKpiId('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI Entry History"
        description="Review all your past KPI submission records, achievements, and status calculations."
        documentTitle="KPI History"
      />

      {/* Filter toolbar */}
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-4 items-end">
          <Field label="From Date">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To Date">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Filter by Indicator">
            <Select value={selectedKpiId} onChange={(e) => setSelectedKpiId(e.target.value)}>
              <option value="">All Indicators</option>
              {state.data?.kpis.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <Button variant="ghost" size="md" onClick={resetFilters} leftIcon={<FilterX className="size-4" />}>
              Reset Filters
            </Button>
          </div>
        </CardBody>
      </Card>

      <AsyncBoundary state={state}>
        {({ entries }) => (
          <Card>
            {entries.length === 0 ? (
              <EmptyState
                icon={History}
                title="No submission records found"
                description="Try adjusting your date range or indicator filter."
              />
            ) : (
              <Table caption="Historical KPI submissions">
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>KPI Name</TH>
                    <TH align="right">Target</TH>
                    <TH align="right">Actual</TH>
                    <TH align="right">Achievement %</TH>
                    <TH align="center">Status</TH>
                    <TH hideBelow="md">Notes / Remarks</TH>
                  </TR>
                </THead>
                <TBody>
                  {entries.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="font-medium text-zinc-900 whitespace-nowrap">
                        {formatDate(entry.date, 'short')}
                      </TD>
                      <TD>
                        <span className="font-semibold text-zinc-900">{entry.kpiName}</span>
                        <span className="text-xs text-zinc-400 block">{entry.unit}</span>
                      </TD>
                      <TD align="right" className="font-medium">
                        {formatNumber(entry.target)} {entry.unit}
                      </TD>
                      <TD align="right" className="font-semibold text-zinc-900">
                        {formatNumber(entry.actual)} {entry.unit}
                      </TD>
                      <TD align="right" className="font-semibold tabular">
                        {formatPercent(entry.performancePercent)}
                      </TD>
                      <TD align="center">
                        <PerformanceStatusBadge status={entry.status} />
                      </TD>
                      <TD hideBelow="md" className="text-xs text-zinc-500 max-w-xs truncate">
                        {entry.note || '—'}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        )}
      </AsyncBoundary>
    </div>
  );
}
