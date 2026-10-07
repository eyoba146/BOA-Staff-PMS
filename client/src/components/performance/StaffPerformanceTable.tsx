import { Link } from 'react-router-dom';
import type { StaffPerformanceRow } from '@/types';
import { Table, THead, TBody, TR, TH, TD, PerformanceStatusBadge, ProgressBar, Avatar } from '@/components/ui';
import { formatPercent } from '@/utils/format';
import { paths } from '@/routes/paths';

interface StaffPerformanceTableProps {
  rows: StaffPerformanceRow[];
}

export function StaffPerformanceTable({ rows }: StaffPerformanceTableProps) {
  if (rows.length === 0) {
    return <p className="p-4 text-center text-xs text-zinc-500">No staff performance data found.</p>;
  }

  return (
    <Table caption="Staff branch performance summary">
      <THead>
        <TR>
          <TH>Staff Member</TH>
          <TH hideBelow="md">Position</TH>
          <TH hideBelow="sm" className="w-36">Overall Progress</TH>
          <TH align="right">Performance %</TH>
          <TH align="center">Entries</TH>
          <TH align="center">Status</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.staffId} interactive>
            <TD>
              <Link
                to={paths.manager.staffDetail(row.staffId)}
                className="flex items-center gap-2.5 hover:underline"
              >
                <Avatar name={row.fullName} size="sm" />
                <div>
                  <span className="font-semibold text-zinc-900 block">{row.fullName}</span>
                  <span className="text-[11px] text-zinc-400 block">{row.employeeId}</span>
                </div>
              </Link>
            </TD>
            <TD hideBelow="md" className="text-xs text-zinc-600">
              {row.position}
            </TD>
            <TD hideBelow="sm">
              <ProgressBar percent={row.overallPercent} status={row.status} label={row.fullName} />
            </TD>
            <TD align="right" className="font-semibold text-zinc-900 tabular">
              {formatPercent(row.overallPercent)}
            </TD>
            <TD align="center" className="text-xs text-zinc-500 tabular">
              {row.entriesSubmitted} / {row.entriesExpected}
            </TD>
            <TD align="center">
              <PerformanceStatusBadge status={row.status} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
