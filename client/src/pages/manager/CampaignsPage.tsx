import { useState, useCallback } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';
import { campaignService } from '@/services/campaign.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary, ConfirmDialog } from '@/components/shared';
import { CampaignDialog } from '@/components/campaign/CampaignDialog';
import { Card, Button, Input, Select, Badge, EmptyState } from '@/components/ui';
import type { Campaign, CampaignInput, CampaignStatus } from '@/types';
import { formatDate } from '@/utils/date';

export function CampaignsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    const [campaignsData, types] = await Promise.all([
      campaignService.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      }),
      campaignService.getTypes(),
    ]);
    return { campaignsData, types };
  }, [statusFilter, typeFilter]);

  const state = useAsync(loadData, [loadData]);

  const handleSaveCampaign = async (input: CampaignInput) => {
    try {
      if (editingCampaign) {
        await campaignService.update(editingCampaign.id, input);
        showToast({
          tone: 'success',
          title: 'Campaign Updated',
          message: `Campaign "${input.name}" was updated successfully.`,
        });
      } else {
        await campaignService.create(input);
        showToast({
          tone: 'success',
          title: 'Campaign Created',
          message: `Campaign "${input.name}" was created successfully.`,
        });
      }
      await state.reload({ silent: true });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Operation Failed',
        message: err?.message || 'Failed to save campaign.',
      });
      throw err;
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return;
    try {
      await campaignService.delete(deletingCampaign.id);
      showToast({
        tone: 'success',
        title: 'Campaign Removed',
        message: `Campaign "${deletingCampaign.name}" has been deleted.`,
      });
      setDeletingCampaign(null);
      await state.reload({ silent: true });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete campaign.',
      });
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const blob = await campaignService.exportExcel();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BOA_Campaign_Performance_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast({
        tone: 'success',
        title: 'Excel Export Complete',
        message: 'Campaign performance spreadsheet downloaded successfully.',
      });
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Export Failed',
        message: err?.message || 'Could not generate campaign export.',
      });
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge tone="info" className="gap-1 font-semibold">
            <TrendingUp className="size-3" /> In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge tone="success" className="gap-1 font-semibold">
            <CheckCircle2 className="size-3" /> Completed
          </Badge>
        );
      case 'planned':
        return (
          <Badge tone="neutral" className="gap-1 font-semibold">
            <Clock className="size-3" /> Planned
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge tone="danger" className="gap-1 font-semibold">
            <AlertCircle className="size-3" /> Cancelled
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Campaign Management"
        description="Oversee branch-wide operational campaigns, deposit mobilization drives, targets, and achievement metrics."
        documentTitle="Branch Campaigns"
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="size-4 text-emerald-600" />}
              onClick={handleExportExcel}
              loading={exporting}
            >
              Export Campaign Excel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditingCampaign(null);
                setDialogOpen(true);
              }}
            >
              New Campaign
            </Button>
          </div>
        }
      />

      <AsyncBoundary state={state}>
        {({ campaignsData, types }) => {
          const { campaigns, summary } = campaignsData;

          const filtered = campaigns.filter((c) => {
            const matchesSearch =
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.type.toLowerCase().includes(search.toLowerCase()) ||
              (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
            return matchesSearch;
          });

          return (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border border-zinc-200/90 shadow-xs">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gold-50 border border-gold-200/80 text-gold-700">
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Total Campaigns</p>
                    <p className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">{summary.total}</p>
                  </div>
                </Card>

                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border border-zinc-200/90 shadow-xs">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700">
                    <TrendingUp className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">In Progress</p>
                    <p className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">{summary.inProgress}</p>
                  </div>
                </Card>

                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border border-zinc-200/90 shadow-xs">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Completed</p>
                    <p className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">{summary.completed}</p>
                  </div>
                </Card>

                <Card className="p-4 sm:p-5 flex items-center gap-3.5 border border-zinc-200/90 shadow-xs">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700">
                    <Percent className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Avg Achievement</p>
                    <p className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">
                      {summary.averageAchievement !== null ? `${Math.round(summary.averageAchievement)}%` : 'N/A'}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-zinc-200/90 shadow-xs">
                <div className="w-full sm:w-80">
                  <Input
                    placeholder="Search campaigns by name or keyword..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 whitespace-nowrap">Status:</span>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-36 text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="in_progress">In Progress</option>
                      <option value="planned">Planned</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 whitespace-nowrap">Type:</span>
                    <Select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-48 text-xs"
                    >
                      <option value="all">All Types</option>
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {/* Campaign Performance Table */}
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No campaigns found"
                  description="No campaigns match your filter criteria. You can create a new branch operational campaign at any time."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEditingCampaign(null);
                        setDialogOpen(true);
                      }}
                    >
                      Create First Campaign
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-600">
                      <thead className="border-b border-zinc-200 bg-zinc-50/80 font-semibold text-zinc-900">
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 sm:pl-6">Campaign Name</th>
                          <th className="px-3 py-3.5">Type</th>
                          <th className="px-3 py-3.5 text-right">Branch Target</th>
                          <th className="px-3 py-3.5 text-right">Actual Result</th>
                          <th className="px-3 py-3.5 text-center min-w-[130px]">Achievement</th>
                          <th className="px-3 py-3.5">Timeline</th>
                          <th className="px-3 py-3.5">Status</th>
                          <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filtered.map((c) => {
                          const hasActual = c.actual !== null && c.actual !== undefined;
                          const achievementPct = c.achievement;
                          const roundedPct = achievementPct !== null ? Math.round(achievementPct) : null;

                          return (
                            <tr key={c.id} className="hover:bg-zinc-50/70 transition-colors">
                              {/* Name & Description */}
                              <td className="py-4 pl-4 pr-3 sm:pl-6 max-w-xs">
                                <div className="font-semibold text-zinc-900 text-[13px]">{c.name}</div>
                                {c.description && (
                                  <div className="text-[11px] text-zinc-500 truncate mt-0.5 max-w-[220px]">
                                    {c.description}
                                  </div>
                                )}
                              </td>

                              {/* Type */}
                              <td className="px-3 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[11.5px] font-medium text-zinc-700">
                                  {c.type}
                                </span>
                              </td>

                              {/* Branch Target / Plan */}
                              <td className="px-3 py-4 text-right font-mono font-medium text-zinc-900">
                                {c.target.toLocaleString()}
                              </td>

                              {/* Actual Result */}
                              <td className="px-3 py-4 text-right font-mono">
                                {hasActual ? (
                                  <span className="font-semibold text-zinc-900">
                                    {c.actual!.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 italic">Not entered</span>
                                )}
                              </td>

                              {/* Achievement % */}
                              <td className="px-3 py-4 text-center">
                                {hasActual && achievementPct !== null ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-mono">
                                      <span
                                        className={`font-bold ${
                                          roundedPct! >= 85
                                            ? 'text-emerald-700'
                                            : roundedPct! >= 70
                                            ? 'text-amber-700'
                                            : 'text-red-700'
                                        }`}
                                      >
                                        {roundedPct}%
                                      </span>
                                      <span className="text-zinc-400 text-[10px]">({achievementPct.toFixed(1)}%)</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          roundedPct! >= 85
                                            ? 'bg-emerald-500'
                                            : roundedPct! >= 70
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, achievementPct))}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 font-mono">N/A</span>
                                )}
                              </td>

                              {/* Dates */}
                              <td className="px-3 py-4 whitespace-nowrap text-[11.5px]">
                                <div className="flex items-center gap-1 text-zinc-700">
                                  <Calendar className="size-3 text-zinc-400" />
                                  <span>{formatDate(c.startDate, 'short')}</span>
                                  <span className="text-zinc-400">→</span>
                                  <span>{formatDate(c.endDate, 'short')}</span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-3 py-4 whitespace-nowrap">
                                {getStatusBadge(c.status)}
                              </td>

                              {/* Actions */}
                              <td className="py-4 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-8 p-0"
                                    title="Edit campaign"
                                    onClick={() => {
                                      setEditingCampaign(c);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Edit2 className="size-3.5 text-zinc-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete campaign"
                                    onClick={() => setDeletingCampaign(c)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Add / Edit Campaign Modal */}
              <CampaignDialog
                open={dialogOpen}
                onClose={() => {
                  setDialogOpen(false);
                  setEditingCampaign(null);
                }}
                campaign={editingCampaign}
                types={types}
                onSubmit={handleSaveCampaign}
              />

              {/* Delete Confirmation Dialog */}
              <ConfirmDialog
                open={Boolean(deletingCampaign)}
                onCancel={() => setDeletingCampaign(null)}
                onConfirm={handleDeleteCampaign}
                title="Delete Branch Campaign"
                description={`Are you sure you want to delete campaign "${deletingCampaign?.name}"? All associated target and achievement records will be permanently removed.`}
                confirmLabel="Delete Campaign"
                destructive
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
