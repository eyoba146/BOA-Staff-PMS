import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Target,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  TrendingUp,
  CheckCircle2,
  Award,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { performanceService } from '@/services/performance.service';
import { campaignService } from '@/services/campaign.service';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { todayISO, addDays, formatDate } from '@/utils/date';
import { formatPercent } from '@/utils/format';
import { exportReportToCSV, exportReportToExcel } from '@/utils/reportExport';
import type { PerformancePeriod, PerformanceStatus } from '@/types';
import { PageHeader, PendingValidationNotice, AsyncBoundary } from '@/components/shared';
import { paths } from '@/routes/paths';
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
  Avatar,
  Badge,
} from '@/components/ui';

export function ReportsPage() {
  const { user } = useAuth();
  const branchName = user?.branchName || 'Bank of Abyssinia Branch';
  const managerName = user?.fullName || 'Branch Manager';

  const [period, setPeriod] = useState<PerformancePeriod>('monthly');
  const [fromDate, setFromDate] = useState(() => addDays(todayISO(), -30));
  const [toDate, setToDate] = useState(() => todayISO());
  const [activeReportTab, setActiveReportTab] = useState<'staff' | 'kpi' | 'campaign' | 'executive'>('staff');

  // Interactive filters within the report view
  const [staffSearch, setStaffSearch] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | PerformanceStatus>('all');
  const [kpiSearch, setKpiSearch] = useState('');

  const loadReport = useCallback(async () => {
    const [reportData, campaignsData] = await Promise.all([
      performanceService.getReport(period, fromDate, toDate),
      campaignService.list().catch(() => ({ campaigns: [], summary: { total: 0, inProgress: 0, completed: 0, planned: 0, averageAchievement: null } })),
    ]);
    return { ...reportData, campaignsData };
  }, [period, fromDate, toDate]);

  const state = useAsync(loadReport, [loadReport]);
  const report = state.data;

  // Handle export actions
  const handleExportCSV = () => {
    if (!report) return;
    exportReportToCSV(report, branchName);
  };

  const handleExportExcel = () => {
    if (!report) return;
    exportReportToExcel(report, branchName);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    if (!report?.byStaff) return [];
    return report.byStaff.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.employeeId.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.position.toLowerCase().includes(staffSearch.toLowerCase());
      const matchesStatus =
        staffStatusFilter === 'all' || s.status === staffStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [report?.byStaff, staffSearch, staffStatusFilter]);

  // Filtered KPI list
  const filteredKpis = useMemo(() => {
    if (!report?.byKpi) return [];
    return report.byKpi.filter((k) =>
      k.kpiName.toLowerCase().includes(kpiSearch.toLowerCase()) ||
      k.unit.toLowerCase().includes(kpiSearch.toLowerCase())
    );
  }, [report?.byKpi, kpiSearch]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!report) return null;
    const staffList = report.byStaff;
    const validStaff = staffList.filter((s) => s.overallPercent !== null);
    const avgScore =
      validStaff.length > 0
        ? Math.round(
            (validStaff.reduce((acc, s) => acc + (s.overallPercent ?? 0), 0) /
              validStaff.length) *
              10
          ) / 10
        : 0;

    const onTargetCount = staffList.filter((s) => s.status === 'on_target').length;
    const needsAttentionCount = staffList.filter(
      (s) => s.status === 'needs_attention'
    ).length;
    const belowTargetCount = staffList.filter(
      (s) => s.status === 'below_target'
    ).length;
    const attainmentRate =
      staffList.length > 0
        ? Math.round((onTargetCount / staffList.length) * 100)
        : 0;

    const totalSubmitted = staffList.reduce((acc, s) => acc + s.entriesSubmitted, 0);
    const totalExpected = staffList.reduce((acc, s) => acc + s.entriesExpected, 0);
    const complianceRate =
      totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 100;

    return {
      avgScore,
      attainmentRate,
      onTargetCount,
      needsAttentionCount,
      belowTargetCount,
      totalStaff: staffList.length,
      totalSubmitted,
      totalExpected,
      complianceRate,
    };
  }, [report]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* Screen Header & Multi-Format Export Toolbar (Hidden during Print)         */}
      {/* ========================================================================= */}
      <div className="print:hidden">
        <PageHeader
          title="Performance Reports & Analytics"
          description="Consolidated branch performance audits, employee scorecards, KPI attainment metrics, and governance compliance."
          documentTitle="Performance Reports"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleExportCSV}
                disabled={!report || state.loading}
                leftIcon={<FileText className="size-4 text-emerald-600" />}
                title="Download standard comma-separated values (RFC 4180 with UTF-8 BOM)"
              >
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleExportExcel}
                disabled={!report || state.loading}
                leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
                title="Download formatted multi-sheet Excel workbook (.xls)"
              >
                Export Excel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handlePrintPDF}
                disabled={!report || state.loading}
                leftIcon={<Printer className="size-4 text-gold-400" />}
                title="Generate printable PDF report with official Bank of Abyssinia letterhead"
              >
                Print / PDF
              </Button>
            </div>
          }
        />
      </div>

      {/* ========================================================================= */}
      {/* Official Bank Print Letterhead (Visible ONLY during Print / PDF Export)   */}
      {/* ========================================================================= */}
      {report && (
        <div className="hidden print:block border-b-2 border-zinc-900 pb-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-gold-500" />
                <h1 className="text-xl font-bold tracking-tight text-ink-950 uppercase">
                  Bank of Abyssinia
                </h1>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mt-0.5">
                Branch Staff Performance Management System
              </p>
              <h2 className="text-base font-bold text-ink-900 mt-2">
                Official Branch Performance Audit Report
              </h2>
            </div>
            <div className="text-right text-xs text-zinc-600 space-y-0.5">
              <p>
                <span className="font-semibold text-zinc-900">Branch:</span> {branchName}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">Cycle:</span>{' '}
                {period.toUpperCase()} ({formatDate(report.from)} – {formatDate(report.to)})
              </p>
              <p>
                <span className="font-semibold text-zinc-900">Generated:</span>{' '}
                {new Date(report.generatedAt).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold text-zinc-900">Evaluator:</span>{' '}
                {managerName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Filter Controls (Hidden during Print)                                     */}
      {/* ========================================================================= */}
      <Card className="print:hidden">
        <CardBody className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
          <Field label="Cycle Period" className="w-full sm:w-40">
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

          <Field label="From Date" className="w-full sm:w-44">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              leftIcon={<Calendar className="size-4 text-zinc-400" />}
            />
          </Field>

          <Field label="To Date" className="w-full sm:w-44">
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              leftIcon={<Calendar className="size-4 text-zinc-400" />}
            />
          </Field>

          <div className="text-xs text-zinc-500 pb-0 sm:pb-2">
            Coverage Window: <span className="font-semibold text-zinc-700">{formatDate(fromDate)}</span> –{' '}
            <span className="font-semibold text-zinc-700">{formatDate(toDate)}</span>
          </div>
        </CardBody>
      </Card>

      <AsyncBoundary state={state}>
        {(loadedReport) => (
          <div className="space-y-6">
            <div className="print:hidden">
              <PendingValidationNotice basis={loadedReport.calculationBasis} />
            </div>

            {/* ========================================================================= */}
            {/* Executive KPI Summary Cards                                               */}
            {/* ========================================================================= */}
            {summaryStats && (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
                {/* Branch Average Score */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Branch Average Score
                    </span>
                    <TrendingUp className="size-4 text-gold-600" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 tabular">
                      {summaryStats.avgScore}%
                    </span>
                    <Badge
                      tone={
                        summaryStats.avgScore >= 85
                          ? 'success'
                          : summaryStats.avgScore >= 70
                          ? 'attention'
                          : 'danger'
                      }
                    >
                      {summaryStats.avgScore >= 85
                        ? 'Strong'
                        : summaryStats.avgScore >= 70
                        ? 'Acceptable'
                        : 'Review Required'}
                    </Badge>
                  </div>
                  <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-zinc-500 line-clamp-1">
                    Evaluated across {summaryStats.totalStaff} staff roster members
                  </p>
                </div>

                {/* Target Attainment Rate */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Target Attainment
                    </span>
                    <Award className="size-4 text-emerald-600" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 tabular">
                      {summaryStats.attainmentRate}%
                    </span>
                    <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">meeting target</span>
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-zinc-500">
                    <span className="font-semibold text-emerald-700">
                      {summaryStats.onTargetCount} on target
                    </span>
                    <span>•</span>
                    <span className="text-amber-700 font-semibold">
                      {summaryStats.needsAttentionCount} coaching
                    </span>
                  </div>
                </div>

                {/* Submission Compliance */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Audit Compliance
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 tabular">
                      {summaryStats.complianceRate}%
                    </span>
                    <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">entries logged</span>
                  </div>
                  <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-zinc-500 tabular line-clamp-1">
                    {summaryStats.totalSubmitted} submitted of {summaryStats.totalExpected} expected
                  </p>
                </div>

                {/* Active KPIs Tracked */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Indicators Monitored
                    </span>
                    <Target className="size-4 text-blue-600" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-950 tabular">
                      {loadedReport.byKpi.length}
                    </span>
                    <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">KPIs in cycle</span>
                  </div>
                  <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-zinc-500 line-clamp-1">
                    {loadedReport.byKpi.filter((k) => k.status === 'on_target').length} indicators within target band
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* Performance Cohort Visualizer Bar                                         */}
            {/* ========================================================================= */}
            {summaryStats && summaryStats.totalStaff > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Staff Distribution Breakdown
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      On Target: {summaryStats.onTargetCount} (
                      {Math.round((summaryStats.onTargetCount / summaryStats.totalStaff) * 100)}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-amber-700">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Needs Attention: {summaryStats.needsAttentionCount} (
                      {Math.round((summaryStats.needsAttentionCount / summaryStats.totalStaff) * 100)}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-rose-700">
                      <span className="size-2 rounded-full bg-rose-500" />
                      Below Target: {summaryStats.belowTargetCount} (
                      {Math.round((summaryStats.belowTargetCount / summaryStats.totalStaff) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Split Segmented Distribution Bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    style={{
                      width: `${(summaryStats.onTargetCount / summaryStats.totalStaff) * 100}%`,
                    }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`On Target: ${summaryStats.onTargetCount}`}
                  />
                  <div
                    style={{
                      width: `${(summaryStats.needsAttentionCount / summaryStats.totalStaff) * 100}%`,
                    }}
                    className="bg-amber-400 transition-all duration-300"
                    title={`Needs Attention: ${summaryStats.needsAttentionCount}`}
                  />
                  <div
                    style={{
                      width: `${(summaryStats.belowTargetCount / summaryStats.totalStaff) * 100}%`,
                    }}
                    className="bg-rose-500 transition-all duration-300"
                    title={`Below Target: ${summaryStats.belowTargetCount}`}
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* Screen Navigation Tabs (Hidden during Print)                              */}
            {/* ========================================================================= */}
            <div className="flex border-b border-zinc-200 print:hidden">
              <button
                type="button"
                onClick={() => setActiveReportTab('staff')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  activeReportTab === 'staff'
                    ? 'border-ink-950 text-ink-950'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
              >
                <Users className="size-4" />
                Staff Performance Roster ({loadedReport.byStaff.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveReportTab('kpi')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  activeReportTab === 'kpi'
                    ? 'border-ink-950 text-ink-950'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
              >
                <Target className="size-4" />
                Indicator (KPI) Breakdown ({loadedReport.byKpi.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveReportTab('campaign')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  activeReportTab === 'campaign'
                    ? 'border-ink-950 text-ink-950'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
              >
                <Layers className="size-4" />
                Branch Campaigns ({loadedReport.campaignsData?.campaigns?.length ?? 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveReportTab('executive')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  activeReportTab === 'executive'
                    ? 'border-ink-950 text-ink-950'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                }`}
              >
                <ShieldCheck className="size-4" />
                Executive Audit Summary
              </button>
            </div>

            {/* ========================================================================= */}
            {/* Section 1: Staff Performance Directory (Screen: Tab, Print: Always shown) */}
            {/* ========================================================================= */}
            <div
              className={
                activeReportTab === 'staff'
                  ? 'block'
                  : 'hidden print:block'
              }
            >
              <Card>
                <CardHeader
                  title="Staff Performance Breakdown & Scorecards"
                  description={`Audited staff results for ${branchName} during cycle ${formatDate(
                    loadedReport.from
                  )} to ${formatDate(loadedReport.to)}`}
                  actions={
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                      <div className="relative w-56">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-zinc-400" />
                        <Input
                          placeholder="Search staff or ID..."
                          value={staffSearch}
                          onChange={(e) => setStaffSearch(e.target.value)}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                      <Select
                        value={staffStatusFilter}
                        onChange={(e) =>
                          setStaffStatusFilter(e.target.value as 'all' | PerformanceStatus)
                        }
                        className="h-8 w-36 text-xs"
                      >
                        <option value="all">All Statuses</option>
                        <option value="on_target">On Target</option>
                        <option value="needs_attention">Needs Attention</option>
                        <option value="below_target">Below Target</option>
                      </Select>
                    </div>
                  }
                />

                {filteredStaff.length === 0 ? (
                  <p className="p-8 text-center text-xs text-zinc-500">
                    No staff members match the selected criteria.
                  </p>
                ) : (
                  <Table caption="Staff branch performance summary">
                    <THead>
                      <TR>
                        <TH>Employee</TH>
                        <TH hideBelow="md">Designation / Role</TH>
                        <TH align="center">Entries Logged</TH>
                        <TH hideBelow="sm" className="w-36">
                          Achievement Progress
                        </TH>
                        <TH align="right">Score %</TH>
                        <TH align="center">Status Band</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {filteredStaff.map((row) => {
                        const compliance =
                          row.entriesExpected > 0
                            ? Math.round(
                                (row.entriesSubmitted / row.entriesExpected) * 100
                              )
                            : 100;
                        return (
                          <TR key={row.staffId} interactive>
                            <TD>
                              <Link
                                to={paths.manager.staffDetail(row.staffId)}
                                className="flex items-center gap-2.5 hover:underline"
                              >
                                <Avatar name={row.fullName} size="sm" />
                                <div>
                                  <span className="font-semibold text-zinc-900 block">
                                    {row.fullName}
                                  </span>
                                  <span className="text-[11px] font-mono text-zinc-500 block">
                                    {row.employeeId}
                                  </span>
                                </div>
                              </Link>
                            </TD>
                            <TD hideBelow="md" className="text-xs text-zinc-600 font-medium">
                              {row.position}
                            </TD>
                            <TD align="center">
                              <span className="text-xs font-medium text-zinc-700 tabular">
                                {row.entriesSubmitted} / {row.entriesExpected}
                              </span>
                              <span className="block text-[10px] text-zinc-400 tabular">
                                ({compliance}% compliance)
                              </span>
                            </TD>
                            <TD hideBelow="sm">
                              <ProgressBar
                                percent={row.overallPercent}
                                status={row.status}
                                label={row.fullName}
                              />
                            </TD>
                            <TD align="right" className="font-bold text-zinc-950 tabular text-sm">
                              {formatPercent(row.overallPercent)}
                            </TD>
                            <TD align="center">
                              <PerformanceStatusBadge status={row.status} />
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                )}
              </Card>
            </div>

            {/* ========================================================================= */}
            {/* Section 2: Indicator Breakdown (Screen: Tab, Print: Always shown)         */}
            {/* ========================================================================= */}
            <div
              className={
                activeReportTab === 'kpi'
                  ? 'block'
                  : 'hidden print:block print:mt-6'
              }
            >
              <Card>
                <CardHeader
                  title="Key Performance Indicator (KPI) Summary"
                  description="Branch-wide aggregated achievement and distribution across operational indicators"
                  actions={
                    <div className="relative w-56 print:hidden">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-zinc-400" />
                      <Input
                        placeholder="Search indicators..."
                        value={kpiSearch}
                        onChange={(e) => setKpiSearch(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  }
                />

                {filteredKpis.length === 0 ? (
                  <p className="p-8 text-center text-xs text-zinc-500">
                    No indicator activity recorded within this evaluation window.
                  </p>
                ) : (
                  <Table caption="Performance by KPI">
                    <THead>
                      <TR>
                        <TH>Indicator Name</TH>
                        <TH align="center">Metric Unit</TH>
                        <TH align="center">Type</TH>
                        <TH align="center">Assigned Staff</TH>
                        <TH align="center">Recorded Entries</TH>
                        <TH hideBelow="sm" className="w-36">
                          Branch Progress
                        </TH>
                        <TH align="right">Avg Attainment %</TH>
                        <TH align="center">Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {filteredKpis.map((kpi) => (
                        <TR key={kpi.kpiId}>
                          <TD className="font-semibold text-zinc-900">
                            {kpi.kpiName}
                          </TD>
                          <TD align="center" className="text-xs text-zinc-500 font-mono">
                            {kpi.unit}
                          </TD>
                          <TD align="center" className="text-xs text-zinc-500 capitalize">
                            {kpi.valueType}
                          </TD>
                          <TD align="center" className="text-xs text-zinc-700 font-semibold tabular">
                            {kpi.assignedStaff}
                          </TD>
                          <TD align="center" className="text-xs text-zinc-700 tabular">
                            {kpi.entries}
                          </TD>
                          <TD hideBelow="sm">
                            <ProgressBar
                              percent={kpi.averagePercent}
                              status={kpi.status}
                              label={kpi.kpiName}
                            />
                          </TD>
                          <TD align="right" className="font-bold text-zinc-950 tabular text-sm">
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
            </div>

            {/* ========================================================================= */}
            {/* Section 3: Executive Summary & Governance Audit Table                     */}
            {/* ========================================================================= */}
            <div
              className={
                activeReportTab === 'executive'
                  ? 'block'
                  : 'hidden print:block print:mt-6'
              }
            >
              <Card>
                <CardHeader
                  title="Executive Governance & Calculation Audit"
                  description="System parameters, calculation basis, and operational audit metadata"
                />
                <CardBody className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Operational Branch Profile
                      </h4>
                      <dl className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Branch Name</dt>
                          <dd className="font-semibold text-zinc-900">{branchName}</dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Evaluation Cycle</dt>
                          <dd className="font-semibold text-zinc-900 uppercase">{period}</dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Report Window</dt>
                          <dd className="font-semibold text-zinc-900">
                            {formatDate(loadedReport.from)} – {formatDate(loadedReport.to)}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Audit Timestamp</dt>
                          <dd className="font-semibold text-zinc-900">
                            {new Date(loadedReport.generatedAt).toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between py-1">
                          <dt className="text-zinc-500">Calculation Engine</dt>
                          <dd className="font-semibold text-zinc-900">
                            {loadedReport.calculationBasis === 'approved'
                              ? 'Production Rules Engine (Validated)'
                              : 'Preliminary Draft Engine'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Performance Tier Breakdown
                      </h4>
                      <dl className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">On Target (≥ 90%)</dt>
                          <dd className="font-semibold text-emerald-700">
                            {summaryStats?.onTargetCount} staff (
                            {summaryStats && summaryStats.totalStaff > 0
                              ? Math.round(
                                  (summaryStats.onTargetCount / summaryStats.totalStaff) * 100
                                )
                              : 0}
                            %)
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Needs Attention (75% - 89%)</dt>
                          <dd className="font-semibold text-amber-700">
                            {summaryStats?.needsAttentionCount} staff (
                            {summaryStats && summaryStats.totalStaff > 0
                              ? Math.round(
                                  (summaryStats.needsAttentionCount / summaryStats.totalStaff) * 100
                                )
                              : 0}
                            %)
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Below Target (&lt; 75%)</dt>
                          <dd className="font-semibold text-rose-700">
                            {summaryStats?.belowTargetCount} staff (
                            {summaryStats && summaryStats.totalStaff > 0
                              ? Math.round(
                                  (summaryStats.belowTargetCount / summaryStats.totalStaff) * 100
                                )
                              : 0}
                            %)
                          </dd>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-200">
                          <dt className="text-zinc-500">Roster Submission Rate</dt>
                          <dd className="font-semibold text-zinc-900">
                            {summaryStats?.complianceRate}%
                          </dd>
                        </div>
                        <div className="flex justify-between py-1">
                          <dt className="text-zinc-500">Branch Composite Score</dt>
                          <dd className="font-bold text-ink-950 text-sm">
                            {summaryStats?.avgScore}%
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* ========================================================================= */}
            {/* Section: Branch Operational Campaigns                                     */}
            {/* ========================================================================= */}
            <div className={activeReportTab === 'campaign' ? 'block' : 'hidden print:block'}>
              <Card>
                <CardHeader
                  title="Branch Operational Campaigns & Mobilization"
                  description="Operational campaigns, branch deposit sprint targets, and measured attainment."
                  actions={
                    <div className="flex items-center gap-2 print:hidden">
                      <Link to={paths.manager.campaigns}>
                        <Button variant="secondary" size="sm">
                          Manage Campaigns
                        </Button>
                      </Link>
                    </div>
                  }
                />
                <CardBody className="p-0">
                  {(!loadedReport.campaignsData?.campaigns || loadedReport.campaignsData.campaigns.length === 0) ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No operational campaigns recorded for this reporting period.
                    </div>
                  ) : (
                    <Table>
                      <THead>
                        <TR>
                          <TH>Campaign Name</TH>
                          <TH>Type</TH>
                          <TH className="text-right">Target / Plan</TH>
                          <TH className="text-right">Actual</TH>
                          <TH className="text-center">Achievement</TH>
                          <TH>Timeline</TH>
                          <TH>Status</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {loadedReport.campaignsData.campaigns.map((c: any) => (
                          <TR key={c.id}>
                            <TD className="font-semibold text-zinc-900">{c.name}</TD>
                            <TD className="text-zinc-600">{c.type}</TD>
                            <TD className="text-right font-mono font-medium">{c.target.toLocaleString()}</TD>
                            <TD className="text-right font-mono">
                              {c.actual !== null ? c.actual.toLocaleString() : 'Not entered'}
                            </TD>
                            <TD className="text-center font-bold">
                              {c.achievement !== null ? `${Math.round(c.achievement)}%` : 'N/A'}
                            </TD>
                            <TD className="text-xs text-zinc-500">
                              {c.startDate} → {c.endDate}
                            </TD>
                            <TD>
                              <Badge tone={c.status === 'completed' ? 'success' : c.status === 'in_progress' ? 'info' : 'neutral'}>
                                {c.status}
                              </Badge>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* ========================================================================= */}
            {/* Official Print Sign-off Box (Visible ONLY when printing / PDF export)     */}
            {/* ========================================================================= */}
            <div className="hidden print:block mt-12 pt-6 border-t border-zinc-300">
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="border border-zinc-300 rounded p-4 space-y-4">
                  <p className="font-bold uppercase tracking-wider text-zinc-800">
                    Branch Manager Verification
                  </p>
                  <p className="text-zinc-600">
                    I certify that the performance metrics and KPI evaluation records summarized
                    in this report are true and reflect operational branch achievements.
                  </p>
                  <div className="pt-8 flex justify-between items-end border-t border-zinc-300">
                    <div>
                      <p className="font-semibold text-zinc-900">{managerName}</p>
                      <p className="text-[10px] text-zinc-500">Branch Manager, {branchName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400">Date & Signature</p>
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-300 rounded p-4 space-y-4">
                  <p className="font-bold uppercase tracking-wider text-zinc-800">
                    District Operations / HR Sign-off
                  </p>
                  <p className="text-zinc-600">
                    Received and validated for corporate audit and performance compensation
                    records in accordance with Bank of Abyssinia policies.
                  </p>
                  <div className="pt-8 flex justify-between items-end border-t border-zinc-300">
                    <div>
                      <p className="font-semibold text-zinc-900">_____________________________</p>
                      <p className="text-[10px] text-zinc-500">HR / Operations Officer</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400">Date & Corporate Stamp</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-zinc-400 mt-6">
                CONFIDENTIAL — Bank of Abyssinia Internal Performance Document — Generated via Branch Staff PMS
              </p>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
