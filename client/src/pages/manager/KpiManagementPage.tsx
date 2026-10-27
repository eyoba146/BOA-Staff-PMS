import { useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Users,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { kpiService } from '@/services/kpi.service';
import { staffService } from '@/services/staff.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary, ConfirmDialog } from '@/components/shared';
import { KpiFormDialog, BOA_METRIC_PRESETS } from '@/components/kpi/KpiFormDialog';
import { AssignKpiDialog } from '@/components/kpi/AssignKpiDialog';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from '@/components/ui';
import type { Kpi, KpiInput } from '@/types';
import { formatNumber } from '@/utils/format';

export function KpiManagementPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'compact'>('matrix');

  // Form modal
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

  // Assign modal
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningKpi, setAssigningKpi] = useState<Kpi | null>(null);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
  const [loadingStaffAssignments, setLoadingStaffAssignments] = useState(false);

  // Delete modal
  const [deletingKpi, setDeletingKpi] = useState<Kpi | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Scorecard bulk seed state
  const [seedingScorecard, setSeedingScorecard] = useState(false);

  const loadData = useCallback(async () => {
    const [kpis, staffList] = await Promise.all([
      kpiService.list(),
      staffService.list({ status: 'active' }),
    ]);
    return { kpis, staffList };
  }, []);

  const state = useAsync(loadData, [loadData]);

  const handleOpenCreate = () => {
    setEditingKpi(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (kpi: Kpi) => {
    setEditingKpi(kpi);
    setFormDialogOpen(true);
  };

  const handleOpenAssign = async (kpi: Kpi) => {
    setAssigningKpi(kpi);
    setAssignDialogOpen(true);
    setLoadingStaffAssignments(true);
    try {
      const assignments = await kpiService.listAssignments({ kpiId: kpi.id });
      setAssignedStaffIds(assignments.map((a) => a.staffId));
    } catch {
      showToast({ tone: 'danger', title: 'Error', message: 'Could not load current KPI assignments.' });
    } finally {
      setLoadingStaffAssignments(false);
    }
  };

  const handleSaveKpi = async (data: KpiInput) => {
    try {
      if (editingKpi) {
        await kpiService.update(editingKpi.id, data);
        showToast({ tone: 'success', title: 'KPI updated', message: `${data.name} was successfully updated.` });
      } else {
        await kpiService.create(data);
        showToast({ tone: 'success', title: 'KPI created', message: `${data.name} was successfully created.` });
      }
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Save failed', message: 'Could not save KPI definition.' });
    }
  };

  const handleToggleActive = async (kpi: Kpi) => {
    try {
      const updated = await kpiService.setActive(kpi.id, !kpi.isActive);
      showToast({
        tone: 'neutral',
        title: updated.isActive ? 'KPI activated' : 'KPI deactivated',
        message: `${kpi.name} is now ${updated.isActive ? 'active' : 'inactive'}.`,
      });
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Failed', message: 'Could not update KPI status.' });
    }
  };

  const handleSaveAssignments = async (kpiId: string, staffIds: string[]) => {
    try {
      await kpiService.setAssignments(kpiId, staffIds);
      showToast({
        tone: 'success',
        title: 'Assignments updated',
        message: `KPI has been assigned to ${staffIds.length} staff member(s).`,
      });
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Failed', message: 'Could not save assignments.' });
    }
  };

  const handleDeleteKpi = async () => {
    if (!deletingKpi) return;
    setDeleting(true);
    try {
      await kpiService.delete(deletingKpi.id);
      showToast({
        tone: 'success',
        title: 'KPI deleted',
        message: `"${deletingKpi.name}" has been permanently removed.`,
      });
      setDeletingKpi(null);
      await state.reload();
    } catch {
      showToast({ tone: 'danger', title: 'Delete failed', message: 'Could not delete KPI.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedBoaScorecard = async () => {
    setSeedingScorecard(true);
    try {
      let createdCount = 0;
      for (const p of BOA_METRIC_PRESETS) {
        const existing = state.data?.kpis.some(
          (k) =>
            k.name.trim().toLowerCase() === p.name.trim().toLowerCase() ||
            (p.code && k.code === p.code),
        );
        if (!existing) {
          await kpiService.create({
            code: p.code,
            name: p.name,
            description: `Bank of Abyssinia official scorecard metric ${p.code} (${p.name}).`,
            unit: p.unit,
            valueType: p.valueType,
            target: p.daily !== null ? p.daily : p.monthly,
            frequency: p.daily !== null ? 'daily' : 'monthly',
            dailyTarget: p.daily,
            weeklyTarget: p.weekly,
            monthlyTarget: p.monthly,
            quarterlyTarget: p.quarterly,
            yearlyTarget: p.yearly,
            weight: null,
            calculationRule: '(Actual / Target) * 100%',
            ruleStatus: 'approved',
            isActive: true,
          });
          createdCount++;
        }
      }
      showToast({
        tone: 'gold',
        title: 'BOA Scorecard Seeded',
        message: `Successfully loaded ${createdCount} official Bank of Abyssinia KPI metrics.`,
      });
      await state.reload({ silent: true });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Seeding Error',
        message: err?.message || 'Failed to seed BOA scorecard metrics.',
      });
    } finally {
      setSeedingScorecard(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Key Performance Indicators (KPIs)"
        description="Configure branch indicators, multi-period targets (Yearly, Quarterly, Monthly, Weekly, Daily), and staff assignments."
        documentTitle="KPI Management"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="size-4 text-gold-600" />}
              onClick={handleSeedBoaScorecard}
              loading={seedingScorecard}
              title="Populate branch with official Bank of Abyssinia scorecard metrics from management table"
            >
              Load BOA Standard Scorecard
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={handleOpenCreate}
            >
              Add New KPI
            </Button>
          </div>
        }
      />

      <AsyncBoundary state={state}>
        {({ kpis, staffList }) => {
          const filteredKpis = kpis.filter((k) => {
            const matchesSearch =
              k.name.toLowerCase().includes(search.toLowerCase()) ||
              (k.code && k.code.toLowerCase().includes(search.toLowerCase())) ||
              k.description.toLowerCase().includes(search.toLowerCase()) ||
              k.unit.toLowerCase().includes(search.toLowerCase());
            const matchesFreq = frequencyFilter === 'all' || k.frequency === frequencyFilter;
            const matchesActive =
              activeFilter === 'all' ||
              (activeFilter === 'active' && k.isActive) ||
              (activeFilter === 'inactive' && !k.isActive);
            return matchesSearch && matchesFreq && matchesActive;
          });

          // Sort naturally by code/serial number (1, 2, 3, 3.1, etc.) if available
          const sortedKpis = [...filteredKpis].sort((a, b) => {
            if (a.code && b.code) {
              return a.code.localeCompare(b.code, undefined, { numeric: true });
            }
            if (a.code) return -1;
            if (b.code) return 1;
            return a.name.localeCompare(b.name);
          });

          return (
            <div className="space-y-4">
              {/* Filter and View Mode controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search KPIs by name, code, or unit..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>View:</span>
                    <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode('matrix')}
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                          viewMode === 'matrix'
                            ? 'bg-white text-zinc-900 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        Scorecard Matrix
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('compact')}
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                          viewMode === 'compact'
                            ? 'bg-white text-zinc-900 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        Compact
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>Frequency:</span>
                    <Select
                      value={frequencyFilter}
                      onChange={(e) => setFrequencyFilter(e.target.value)}
                      className="w-32"
                    >
                      <option value="all">All</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>Status:</span>
                    <Select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className="w-28"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* KPI Table */}
              <Card>
                {sortedKpis.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-xs text-zinc-500">No KPIs match the specified criteria.</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Sparkles className="size-3.5 text-gold-600" />}
                      onClick={handleSeedBoaScorecard}
                    >
                      Load Bank of Abyssinia Scorecard Metrics
                    </Button>
                  </div>
                ) : viewMode === 'matrix' ? (
                  <Table caption="Bank of Abyssinia Branch KPI Performance Scorecard">
                    <THead>
                      <TR>
                        <TH style={{ width: '60px' }}>S/N</TH>
                        <TH>KPI Name</TH>
                        <TH align="right">Quarterly</TH>
                        <TH align="right">Monthly</TH>
                        <TH align="right">Weekly</TH>
                        <TH align="right">Daily</TH>
                        <TH align="right" hideBelow="lg">Yearly</TH>
                        <TH hideBelow="md" align="center">Assigned</TH>
                        <TH align="center">Status</TH>
                        <TH align="right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {sortedKpis.map((kpi) => (
                        <TR key={kpi.id}>
                          <TD className="font-mono text-xs font-bold text-zinc-600">
                            {kpi.code || '—'}
                          </TD>
                          <TD>
                            <div className="font-semibold text-zinc-900">{kpi.name}</div>
                            <div className="text-[11px] text-zinc-400">
                              Unit: <span className="font-medium text-zinc-600">{kpi.unit}</span>
                            </div>
                          </TD>
                          <TD align="right" className="font-mono text-xs font-semibold text-zinc-900">
                            {kpi.quarterlyTarget !== null && kpi.quarterlyTarget !== undefined
                              ? formatNumber(kpi.quarterlyTarget)
                              : '—'}
                          </TD>
                          <TD align="right" className="font-mono text-xs font-semibold text-zinc-900">
                            {kpi.monthlyTarget !== null && kpi.monthlyTarget !== undefined
                              ? formatNumber(kpi.monthlyTarget)
                              : '—'}
                          </TD>
                          <TD align="right" className="font-mono text-xs font-semibold text-zinc-900">
                            {kpi.weeklyTarget !== null && kpi.weeklyTarget !== undefined
                              ? formatNumber(kpi.weeklyTarget)
                              : '—'}
                          </TD>
                          <TD align="right" className="font-mono text-xs font-bold text-gold-800 bg-gold-50/40">
                            {kpi.dailyTarget !== null && kpi.dailyTarget !== undefined
                              ? formatNumber(kpi.dailyTarget)
                              : '—'}
                          </TD>
                          <TD align="right" hideBelow="lg" className="font-mono text-xs text-zinc-500">
                            {kpi.yearlyTarget !== null && kpi.yearlyTarget !== undefined
                              ? formatNumber(kpi.yearlyTarget)
                              : '—'}
                          </TD>
                          <TD hideBelow="md" align="center">
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(kpi)}
                              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                              title="Assign or reassign staff members"
                            >
                              <Users className="size-3 text-zinc-500" />
                              {kpi.assignedStaffCount} staff
                            </button>
                          </TD>
                          <TD align="center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(kpi)}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                                kpi.isActive
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                              }`}
                              title={kpi.isActive ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {kpi.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </TD>
                          <TD align="right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Edit2 className="size-3.5" />}
                                onClick={() => handleOpenEdit(kpi)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Users className="size-3.5" />}
                                onClick={() => handleOpenAssign(kpi)}
                              >
                                Assign
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                leftIcon={<Trash2 className="size-3.5" />}
                                onClick={() => setDeletingKpi(kpi)}
                                title="Delete KPI"
                              >
                                Delete
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                ) : (
                  <Table caption="Branch KPIs (Summary)">
                    <THead>
                      <TR>
                        <TH style={{ width: '60px' }}>S/N</TH>
                        <TH>Indicator Name</TH>
                        <TH align="right">Primary Target</TH>
                        <TH hideBelow="sm" align="center">Frequency</TH>
                        <TH hideBelow="md" align="center">Weight</TH>
                        <TH hideBelow="md" align="center">Assigned</TH>
                        <TH hideBelow="lg" align="center">Rule Status</TH>
                        <TH align="center">Status</TH>
                        <TH align="right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {sortedKpis.map((kpi) => (
                        <TR key={kpi.id}>
                          <TD className="font-mono text-xs font-bold text-zinc-600">
                            {kpi.code || '—'}
                          </TD>
                          <TD>
                            <div className="font-semibold text-zinc-900">{kpi.name}</div>
                            <div className="text-xs text-zinc-500 line-clamp-1 max-w-sm">
                              {kpi.description}
                            </div>
                          </TD>
                          <TD align="right" className="font-medium text-zinc-900">
                            {formatNumber(kpi.target)} <span className="text-xs text-zinc-400 font-normal">{kpi.unit}</span>
                          </TD>
                          <TD hideBelow="sm" align="center">
                            <span className="capitalize text-xs text-zinc-700 font-medium">
                              {kpi.frequency}
                            </span>
                          </TD>
                          <TD hideBelow="md" align="center" className="text-xs text-zinc-500">
                            {kpi.weight !== null ? `${kpi.weight}%` : '—'}
                          </TD>
                          <TD hideBelow="md" align="center">
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(kpi)}
                              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                              title="Assign/unassign staff members"
                            >
                              <Users className="size-3 text-zinc-500" />
                              {kpi.assignedStaffCount} staff
                            </button>
                          </TD>
                          <TD hideBelow="lg" align="center">
                            {kpi.ruleStatus === 'approved' ? (
                              <Badge tone="success">Approved</Badge>
                            ) : (
                              <Badge tone="validation">Pending validation</Badge>
                            )}
                          </TD>
                          <TD align="center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(kpi)}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                                kpi.isActive
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                              }`}
                              title={kpi.isActive ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {kpi.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </TD>
                          <TD align="right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Edit2 className="size-3.5" />}
                                onClick={() => handleOpenEdit(kpi)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Users className="size-3.5" />}
                                onClick={() => handleOpenAssign(kpi)}
                              >
                                Assign
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                leftIcon={<Trash2 className="size-3.5" />}
                                onClick={() => setDeletingKpi(kpi)}
                                title="Delete KPI"
                              >
                                Delete
                              </Button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </Card>

              {/* Modals */}
              <KpiFormDialog
                open={formDialogOpen}
                onClose={() => setFormDialogOpen(false)}
                kpi={editingKpi}
                onSubmit={handleSaveKpi}
              />

              <AssignKpiDialog
                open={assignDialogOpen}
                onClose={() => setAssignDialogOpen(false)}
                kpi={assigningKpi}
                staffList={staffList}
                assignedStaffIds={assignedStaffIds}
                loadingStaff={loadingStaffAssignments}
                onSave={handleSaveAssignments}
              />

              <ConfirmDialog
                open={Boolean(deletingKpi)}
                onCancel={() => setDeletingKpi(null)}
                onConfirm={handleDeleteKpi}
                title="Delete Performance Metric (KPI)"
                description={
                  deletingKpi && (deletingKpi.assignedStaffCount ?? 0) > 0
                    ? `Are you sure you want to delete "${deletingKpi.name}"? Warning: ${deletingKpi.assignedStaffCount} staff member(s) are currently assigned to this metric. All past entries, targets, and historical records for this KPI will be permanently removed.`
                    : `Are you sure you want to permanently delete the metric "${deletingKpi?.name}"? This action cannot be undone.`
                }
                confirmLabel="Delete Metric"
                destructive
                loading={deleting}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
