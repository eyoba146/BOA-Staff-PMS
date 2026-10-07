import { useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Users,
} from 'lucide-react';
import { kpiService } from '@/services/kpi.service';
import { staffService } from '@/services/staff.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import { KpiFormDialog } from '@/components/kpi/KpiFormDialog';
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

  // Form modal
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

  // Assign modal
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningKpi, setAssigningKpi] = useState<Kpi | null>(null);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
  const [loadingStaffAssignments, setLoadingStaffAssignments] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Key Performance Indicators (KPIs)"
        description="Configure branch indicators, measurement units, frequency, targets, and staff assignments."
        documentTitle="KPI Management"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={handleOpenCreate}
          >
            Add New KPI
          </Button>
        }
      />

      <AsyncBoundary state={state}>
        {({ kpis, staffList }) => {
          const filteredKpis = kpis.filter((k) => {
            const matchesSearch =
              k.name.toLowerCase().includes(search.toLowerCase()) ||
              k.description.toLowerCase().includes(search.toLowerCase()) ||
              k.unit.toLowerCase().includes(search.toLowerCase());
            const matchesFreq = frequencyFilter === 'all' || k.frequency === frequencyFilter;
            const matchesActive =
              activeFilter === 'all' ||
              (activeFilter === 'active' && k.isActive) ||
              (activeFilter === 'inactive' && !k.isActive);
            return matchesSearch && matchesFreq && matchesActive;
          });

          return (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search KPIs by name or unit..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
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
                {filteredKpis.length === 0 ? (
                  <p className="p-8 text-center text-xs text-zinc-500">No KPIs match the specified criteria.</p>
                ) : (
                  <Table caption="Branch KPIs">
                    <THead>
                      <TR>
                        <TH>Indicator Name</TH>
                        <TH align="right">Target</TH>
                        <TH align="center">Frequency</TH>
                        <TH hideBelow="md" align="center">Weight</TH>
                        <TH align="center">Assigned</TH>
                        <TH align="center">Rule Status</TH>
                        <TH align="center">Status</TH>
                        <TH align="right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {filteredKpis.map((kpi) => (
                        <TR key={kpi.id}>
                          <TD>
                            <div className="font-semibold text-zinc-900">{kpi.name}</div>
                            <div className="text-xs text-zinc-500 line-clamp-1 max-w-sm">
                              {kpi.description}
                            </div>
                          </TD>
                          <TD align="right" className="font-medium text-zinc-900">
                            {formatNumber(kpi.target)} <span className="text-xs text-zinc-400 font-normal">{kpi.unit}</span>
                          </TD>
                          <TD align="center">
                            <span className="capitalize text-xs text-zinc-700 font-medium">
                              {kpi.frequency}
                            </span>
                          </TD>
                          <TD hideBelow="md" align="center" className="text-xs text-zinc-500">
                            {kpi.weight !== null ? `${kpi.weight}%` : '—'}
                          </TD>
                          <TD align="center">
                            <button
                              type="button"
                              onClick={() => handleOpenAssign(kpi)}
                              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors"
                              title="Assign/unassign staff members"
                            >
                              <Users className="size-3 text-zinc-500" />
                              {kpi.assignedStaffCount} staff
                            </button>
                          </TD>
                          <TD align="center">
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
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
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
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
