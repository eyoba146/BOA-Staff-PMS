import { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Search,
  CheckCircle2,
  Calendar,
  Briefcase,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  Lock,
  XCircle,
  FileBadge,
  Trash2,
} from 'lucide-react';
import { staffService } from '@/services/staff.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary, ConfirmDialog } from '@/components/shared';
import {
  Card,
  Button,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Avatar,
  AccountStatusBadge,
  Dialog,
  Field,
  Textarea,
  EmptyState,
} from '@/components/ui';
import type { User } from '@/types';
import { paths } from '@/routes/paths';
import { formatDate } from '@/utils/date';
import { toApiError } from '@/services/http/apiClient';

export function StaffListPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pending' ? 'pending' : 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>(initialTab);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingSearch, setPendingSearch] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pending' && activeTab !== 'pending') {
      setActiveTab('pending');
    } else if (tabParam === 'all' && activeTab !== 'all') {
      setActiveTab('all');
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: 'all' | 'pending') => {
    setActiveTab(tab);
    setSearchParams(tab === 'pending' ? { tab: 'pending' } : {});
  };

  // Approval / rejection state
  const [approveUser, setApproveUser] = useState<User | null>(null);
  const [assignedEmpId, setAssignedEmpId] = useState('');
  const [approveError, setApproveError] = useState('');
  const [approving, setApproving] = useState(false);

  const [rejectUser, setRejectUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Delete staff state
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [allStaff, pendingStaff] = await Promise.all([
      staffService.list(),
      staffService.listPending(),
    ]);
    return { allStaff, pendingStaff };
  }, []);

  const state = useAsync(loadData, [loadData]);

  const openApprove = async (staff: User) => {
    setApproveUser(staff);
    setApproveError('');
    if (staff.employeeId) {
      setAssignedEmpId(staff.employeeId);
    } else {
      try {
        const next = await staffService.getNextEmployeeId();
        setAssignedEmpId(next.employeeId);
      } catch {
        setAssignedEmpId('BOA-S001');
      }
    }
  };

  const handleApprove = async () => {
    if (!approveUser) return;
    const cleanId = assignedEmpId.trim().toUpperCase();

    setApproving(true);
    setApproveError('');
    try {
      await staffService.approve(approveUser.id, cleanId ? { employeeId: cleanId } : {});
      showToast({
        tone: 'success',
        title: 'Staff member approved',
        message: `${approveUser.fullName}'s account is now active with Employee ID ${cleanId || 'auto-assigned'}.`,
      });
      setApproveUser(null);
      setAssignedEmpId('');
      await state.reload({ silent: true });
    } catch (err) {
      const apiErr = toApiError(err);
      setApproveError(apiErr.message);
      showToast({ tone: 'danger', title: 'Approval failed', message: apiErr.message });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectUser) return;
    if (!rejectReason.trim()) {
      setRejectError('Please specify the rejection reason.');
      return;
    }

    setRejecting(true);
    try {
      await staffService.reject(rejectUser.id, rejectReason.trim());
      showToast({
        tone: 'neutral',
        title: 'Registration rejected',
        message: `Registration for ${rejectUser.fullName} has been declined.`,
      });
      setRejectUser(null);
      setRejectReason('');
      setRejectError('');
      await state.reload({ silent: true });
    } catch {
      showToast({ tone: 'danger', title: 'Rejection failed', message: 'Could not reject staff account.' });
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await staffService.delete(deleteUser.id);
      showToast({
        tone: 'success',
        title: 'Staff member deleted',
        message: `${deleteUser.fullName}'s account has been permanently removed.`,
      });
      setDeleteUser(null);
      await state.reload();
    } catch (err) {
      const apiErr = toApiError(err);
      showToast({ tone: 'danger', title: 'Delete failed', message: apiErr.message });
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Staff Management"
        description="View enrolled branch employees, clear pending applicant registrations, and inspect performance profiles."
        documentTitle="Staff Management"
      />

      <AsyncBoundary state={state}>
        {({ allStaff, pendingStaff }) => {
          const filteredStaff = allStaff.filter((s) => {
            const matchesSearch =
              s.fullName.toLowerCase().includes(search.toLowerCase()) ||
              s.employeeId.toLowerCase().includes(search.toLowerCase()) ||
              s.position.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
            return matchesSearch && matchesStatus;
          });

          const filteredPending = pendingStaff.filter((s) => {
            const q = pendingSearch.toLowerCase();
            return (
              s.fullName.toLowerCase().includes(q) ||
              s.email.toLowerCase().includes(q) ||
              s.position.toLowerCase().includes(q) ||
              (s.referenceId && s.referenceId.toLowerCase().includes(q))
            );
          });

          return (
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-zinc-200">
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'border-ink-900 text-ink-950 font-bold'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                  }`}
                >
                  <Users className="size-4" />
                  <span>All Staff</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                    {allStaff.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('pending')}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'pending'
                      ? 'border-gold-500 text-ink-950 font-bold'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                  }`}
                >
                  <UserCheck className="size-4 text-gold-600" />
                  <span>Pending Approvals</span>
                  {pendingStaff.length > 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-black text-ink-950 shadow-sm animate-pulse">
                      {pendingStaff.length}
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                      0
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'all' ? (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full sm:w-72">
                      <Input
                        placeholder="Search by name, ID, or position..."
                        leftIcon={<Search className="size-4 text-zinc-400" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs text-zinc-500 whitespace-nowrap">Status:</span>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 sm:w-40"
                      >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="pending_approval">Pending approval</option>
                        <option value="deactivated">Deactivated</option>
                        <option value="rejected">Rejected</option>
                      </Select>
                    </div>
                  </div>

                  {/* Staff Table */}
                  <Card>
                    {filteredStaff.length === 0 ? (
                      <p className="p-8 text-center text-xs text-zinc-500">No staff members match the selected criteria.</p>
                    ) : (
                      <Table caption="Branch Staff Directory">
                        <THead>
                          <TR>
                            <TH>Employee</TH>
                            <TH>Position</TH>
                            <TH hideBelow="md">Branch</TH>
                            <TH align="center">Status</TH>
                            <TH hideBelow="sm">Joined Date</TH>
                            <TH align="right">Action</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {filteredStaff.map((staff) => (
                            <TR key={staff.id} interactive>
                              <TD>
                                <Link
                                  to={paths.manager.staffDetail(staff.id)}
                                  className="flex items-center gap-2.5 hover:underline"
                                >
                                  <Avatar name={staff.fullName} src={staff.avatarUrl} size="sm" />
                                  <div>
                                    <span className="font-semibold text-zinc-900 block">{staff.fullName}</span>
                                    <span className="text-[11px] text-zinc-400 block">{staff.employeeId}</span>
                                  </div>
                                </Link>
                              </TD>
                              <TD className="text-xs text-zinc-700">{staff.position}</TD>
                              <TD hideBelow="md" className="text-xs text-zinc-500">{staff.branchName}</TD>
                              <TD align="center">
                                <AccountStatusBadge status={staff.status} />
                              </TD>
                              <TD hideBelow="sm" className="text-xs text-zinc-500">
                                {formatDate(staff.createdAt)}
                              </TD>
                              <TD align="right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link to={paths.manager.staffDetail(staff.id)}>
                                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                                      Profile
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    leftIcon={<Trash2 className="size-3.5" />}
                                    onClick={() => setDeleteUser(staff)}
                                    title="Delete staff account"
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
                </div>
              ) : (
                /* 10x Pending Approvals Tab */
                <div className="space-y-6">
                  {/* Executive Clearance Header */}
                  <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-ink-950 shadow-md">
                          <ShieldCheck className="size-6 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-ink-950">
                              Staff Credential Clearance Queue
                            </h3>
                            <span className="rounded-full bg-gold-400/30 border border-gold-500/40 px-2.5 py-0.5 text-xs font-extrabold text-gold-900">
                              {pendingStaff.length} Awaiting Authorization
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-600 max-w-2xl leading-relaxed">
                            Candidates listed below have completed two-factor email verification. Upon your authorization,
                            the system automatically provisions their official sequential Employee ID, activates core branch
                            permissions, and dispatches credential details via Brevo.
                          </p>
                        </div>
                      </div>

                      {pendingStaff.length > 1 && (
                        <div className="w-full sm:w-64">
                          <Input
                            placeholder="Filter pending candidates..."
                            leftIcon={<Search className="size-4 text-zinc-400" />}
                            value={pendingSearch}
                            onChange={(e) => setPendingSearch(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {pendingStaff.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle2}
                      title="All Registrations Cleared"
                      description="There are currently no staff registrations awaiting manager approval. New candidate registrations will appear here in real time as soon as they complete email verification."
                    />
                  ) : filteredPending.length === 0 ? (
                    <p className="p-8 text-center text-xs text-zinc-500">
                      No pending applicants match "{pendingSearch}".
                    </p>
                  ) : (
                    /* 10x Clearance Cards Grid */
                    <div className="grid gap-5 md:grid-cols-2">
                      {filteredPending.map((staff) => (
                        <div
                          key={staff.id}
                          className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg"
                        >
                          <div className="space-y-4">
                            {/* Card Top Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5">
                                <div className="relative">
                                  <Avatar name={staff.fullName} src={staff.avatarUrl} size="md" />
                                  <span
                                    className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white"
                                    title="Email Verified via Brevo OTP"
                                  >
                                    <Check className="size-2.5 stroke-[3]" />
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-base font-bold text-ink-950 group-hover:text-gold-900 transition-colors">
                                    {staff.fullName}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(staff.referenceId || '')}
                                      className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
                                      title="Click to copy registration reference"
                                    >
                                      <span>Ref: {staff.referenceId || 'N/A'}</span>
                                      {copiedRef === staff.referenceId ? (
                                        <Check className="size-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="size-3 text-zinc-400" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-1 text-[11.5px] font-bold text-amber-900 border border-amber-300/60">
                                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                                Pending Clearance
                              </span>
                            </div>

                            {/* Dossier Matrix */}
                            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 text-xs text-zinc-700">
                              <div className="flex items-center gap-2">
                                <Briefcase className="size-3.5 text-zinc-400 shrink-0" />
                                <div className="truncate">
                                  <span className="block text-[10px] uppercase font-bold text-zinc-400">Target Role</span>
                                  <span className="font-semibold text-ink-950 truncate">{staff.position}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building2 className="size-3.5 text-zinc-400 shrink-0" />
                                <div className="truncate">
                                  <span className="block text-[10px] uppercase font-bold text-zinc-400">Branch</span>
                                  <span className="font-semibold text-ink-950 truncate">{staff.branchName}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="size-3.5 text-zinc-400 shrink-0" />
                                <div className="truncate">
                                  <span className="block text-[10px] uppercase font-bold text-zinc-400">Verified Email</span>
                                  <span className="font-semibold text-ink-950 truncate" title={staff.email}>{staff.email}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="size-3.5 text-zinc-400 shrink-0" />
                                <div className="truncate">
                                  <span className="block text-[10px] uppercase font-bold text-zinc-400">Phone</span>
                                  <span className="font-semibold text-ink-950 truncate">{staff.phone}</span>
                                </div>
                              </div>
                            </div>

                            {/* Auto ID Provisioning Notice Pill */}
                            <div className="flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-[11.5px] text-amber-900">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Lock className="size-3.5 text-gold-700" />
                                <span>Official Employee ID:</span>
                              </div>
                              <span className="font-mono font-bold text-gold-800 bg-white px-2 py-0.5 rounded border border-amber-200 shadow-2xs">
                                System Sequential Assignment
                              </span>
                            </div>
                          </div>

                          {/* Footer with Actions */}
                          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-zinc-100 pt-3.5 text-xs text-zinc-500">
                            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                              <Calendar className="size-3.5" />
                              Registered: {formatDate(staff.createdAt)}
                            </span>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<XCircle className="size-3.5 text-red-500" />}
                                onClick={() => setRejectUser(staff)}
                                className="flex-1 sm:flex-initial text-zinc-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                leftIcon={<CheckCircle2 className="size-3.5" />}
                                onClick={() => openApprove(staff)}
                                className="flex-1 sm:flex-initial font-bold shadow-xs"
                              >
                                Review & Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      </AsyncBoundary>

      {/* 10x Official Approval Clearance Modal Dialog */}
      <Dialog
        open={Boolean(approveUser)}
        onClose={() => {
          setApproveUser(null);
          setAssignedEmpId('');
          setApproveError('');
        }}
        title="Official Staff Clearance & Credential Provisioning"
        description="Verify candidate eligibility and authorize Employee ID issuance."
        size="md"
        busy={approving}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setApproveUser(null);
                setAssignedEmpId('');
                setApproveError('');
              }}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              loading={approving}
              leftIcon={<ShieldCheck className="size-4 text-ink-950" />}
              className="font-bold text-sm"
            >
              Confirm Approval & Issue ID
            </Button>
          </>
        }
      >
        {approveUser && (
          <div className="space-y-4 py-1">
            {/* Candidate Dossier Overview Card */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={approveUser.fullName} src={approveUser.avatarUrl} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-ink-950">{approveUser.fullName}</h4>
                    <p className="text-xs text-zinc-500 font-mono">Ref: {approveUser.referenceId || 'N/A'}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300/60">
                  <Check className="size-3 stroke-[3]" />
                  Brevo OTP Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs border-t border-zinc-200/70 pt-3">
                <div>
                  <span className="text-zinc-400 block text-[10.5px] uppercase font-bold">Assigned Position</span>
                  <span className="font-semibold text-zinc-900">{approveUser.position}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10.5px] uppercase font-bold">Assigned Branch</span>
                  <span className="font-semibold text-zinc-900">{approveUser.branchName}</span>
                </div>
                <div className="truncate">
                  <span className="text-zinc-400 block text-[10.5px] uppercase font-bold">Official Email</span>
                  <span className="font-semibold text-zinc-900 truncate" title={approveUser.email}>{approveUser.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10.5px] uppercase font-bold">Contact Phone</span>
                  <span className="font-semibold text-zinc-900">{approveUser.phone}</span>
                </div>
              </div>
            </div>

            {/* Official Sequential Employee ID Block */}
            <div className="space-y-2 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/60 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink-950 flex items-center gap-1.5">
                  <FileBadge className="size-4 text-gold-700" />
                  <span>Provisioned Employee ID</span>
                  <span className="inline-flex items-center rounded-md bg-zinc-200/90 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700">
                    System-Locked
                  </span>
                </label>
                <span className="text-[11px] font-mono font-bold text-gold-800 bg-gold-100/90 border border-gold-300/80 px-2 py-0.5 rounded-md">
                  Sequential Branch ID
                </span>
              </div>

              <div className="relative">
                <Input
                  value={assignedEmpId || 'Generating next ID...'}
                  disabled
                  className="bg-white/90 font-mono font-black text-ink-950 text-base tracking-wider border-amber-300 cursor-not-allowed select-all shadow-inner pl-9"
                />
                <Lock className="size-4 text-gold-600 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                This official Employee ID is sequentially issued by the Bank of Abyssinia directory. It will serve as the staff member's permanent authentication identifier.
              </p>

              {approveError && (
                <p className="text-xs text-red-600 font-semibold pt-1">{approveError}</p>
              )}
            </div>

            {/* Automated Dispatch Checklist */}
            <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3 space-y-1.5 text-xs text-zinc-600">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Post-Approval Actions
              </span>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span>Account status changes to <strong>Active</strong> in branch directory</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span>Standard branch KPIs for <strong>{approveUser.position}</strong> will be assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600 shrink-0" />
                <span>Automated welcome email with login credentials will be delivered via Brevo</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Decline Registration Modal Dialog */}
      <Dialog
        open={Boolean(rejectUser)}
        onClose={() => {
          setRejectUser(null);
          setRejectReason('');
          setRejectError('');
        }}
        title="Decline Staff Registration"
        description={`Provide the official reason for declining ${rejectUser?.fullName}'s registration request.`}
        size="sm"
        busy={rejecting}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRejectUser(null);
                setRejectReason('');
                setRejectError('');
              }}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={rejecting} className="font-bold">
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="py-2 space-y-3">
          {rejectUser && (
            <div className="rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-600 border border-zinc-200">
              <span className="font-semibold text-zinc-900">{rejectUser.fullName}</span> · Ref:{' '}
              <span className="font-mono">{rejectUser.referenceId}</span>
            </div>
          )}
          <Field
            label="Rejection Reason"
            error={rejectError}
            required
            hint="This reason will be recorded in the audit log and emailed to the applicant via Brevo."
          >
            <Textarea
              rows={3}
              placeholder="e.g. Employee record not verified in HR roster; incorrect position selected..."
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError('');
              }}
            />
          </Field>
        </div>
      </Dialog>

      {/* Delete Staff Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteUser)}
        onCancel={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete Staff Account"
        description={`Are you sure you want to permanently delete ${deleteUser?.fullName}'s account (${deleteUser?.employeeId || deleteUser?.email})? All associated performance entries, feedback, and registrations will be permanently erased. This action cannot be undone.`}
        confirmLabel="Delete Account"
        destructive
        loading={deleting}
      />
    </div>
  );
}
