import type { KpiPeriodResult } from '@/types';
import { Table, THead, TBody, TR, TH, TD, PerformanceStatusBadge, ProgressBar } from '@/components/ui';
import { formatNumber, formatPercent } from '@/utils/format';

interface KpiResultsTableProps {
  results: KpiPeriodResult[];
}

export function KpiResultsTable({ results }: KpiResultsTableProps) {
  if (results.length === 0) {
    return <p className="p-4 text-center text-xs text-zinc-500">No KPIs assigned for this period.</p>;
  }

  return (
    <Table caption="Period KPI results">
      <THead>
        <TR>
          <TH>Indicator</TH>
          <TH align="right">Target</TH>
          <TH align="right">Actual</TH>
          <TH hideBelow="sm" className="w-36">Progress</TH>
          <TH align="right">Performance %</TH>
          <TH align="center">Status</TH>
        </TR>
      </THead>
      <TBody>
        {results.map((r) => (
          <TR key={r.kpiId}>
            <TD>
              <div className="font-semibold text-zinc-900">{r.kpiName}</div>
              <div className="text-xs text-zinc-400">
                Unit: {r.unit} {r.weight !== null && `· Weight: ${r.weight}%`}
              </div>
            </TD>
            <TD align="right" className="font-medium">
              {formatNumber(r.target)} <span className="text-xs text-zinc-400 font-normal">{r.unit}</span>
            </TD>
            <TD align="right" className="font-semibold text-zinc-900">
              {r.actual !== null ? (
                <>
                  {formatNumber(r.actual)} <span className="text-xs text-zinc-400 font-normal">{r.unit}</span>
                </>
              ) : (
                <span className="text-zinc-400">—</span>
              )}
            </TD>
            <TD hideBelow="sm">
              <ProgressBar percent={r.performancePercent} status={r.status} label={r.kpiName} />
            </TD>
            <TD align="right" className="font-semibold tabular">
              {formatPercent(r.performancePercent)}
            </TD>
            <TD align="center">
              <PerformanceStatusBadge status={r.status} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
