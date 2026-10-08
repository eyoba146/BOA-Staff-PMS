import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Search,
  CheckCircle,
  Calendar,
  Briefcase,
  Building,
  Phone,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { staffService } from '@/services/staff.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import {
  Card,
  CardBody,
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
import { employeeId } from '@/utils/validation';
import { toApiError } from '@/services/http/apiClient';

export function StaffListPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Approval / rejection state
  const [approveUser, setApproveUser] = useState<User | null>(null);
  const [assignedEmpId, setAssignedEmpId] = useState('');
  const [approveError, setApproveError] = useState('');
  const [approving, setApproving] = useState(false);

  const [rejectUser, setRejectUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = useCallback(async () => {
    const [allStaff, pendingStaff] = await Promise.all([
      staffService.list(),
      staffService.listPending(),
    ]);
    return { allStaff, pendingStaff };
  }, []);

  const state = useAsync(loadData, [loadData]);

  const openApprove = (staff: User) => {
    setApproveUser(staff);
    setAssignedEmpId(staff.employeeId || '');
    setApproveError('');
  };

  const handleApprove = async () => {
    if (!approveUser) return;
    const cleanId = assignedEmpId.trim().toUpperCase();
    if (!cleanId) {
      setApproveError('Official Employee ID is required to approve this account.');
      return;
    }
    const formatErr = employeeId(cleanId);
    if (formatErr) {
      setApproveError(formatErr);
      return;
    }

    setApproving(true);
    setApproveError('');
    try {
      await staffService.approve(approveUser.id, { employeeId: cleanId });
      showToast({
        tone: 'success',
        title: 'Staff member approved',
        message: `${approveUser.fullName}'s account is now active with Employee ID ${cleanId}.`,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Staff Management"
        description="View enrolled branch employees, approve pending registrations, and inspect individual performance profiles."
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

          return (
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex border-b border-zinc-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'border-ink-900 text-ink-900'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                  }`}
                >
                  <Users className="size-4" />
                  All Staff ({allStaff.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'pending'
                      ? 'border-ink-900 text-ink-900'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                  }`}
                >
                  <UserCheck className="size-4" />
                  Pending Approvals
                  {pendingStaff.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-gold-400 px-2 py-0.5 text-xs font-bold text-ink-950">
                      {pendingStaff.length}
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Status:</span>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-40"
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
                                <Link to={paths.manager.staffDetail(staff.id)}>
                                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="size-3.5" />}>
                                    Profile
                                  </Button>
                                </Link>
                              </TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    )}
                  </Card>
                </div>
              ) : (
                /* Pending Approvals Tab */
                <div className="space-y-4">
                  {pendingStaff.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle}
                      title="No pending registrations"
                      description="All branch staff registration requests have been reviewed and processed."
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {pendingStaff.map((staff) => (
                        <Card key={staff.id} className="border-gold-300 ring-1 ring-gold-200/50">
                          <CardBody className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={staff.fullName} src={staff.avatarUrl} size="md" />
                                <div>
                                  <h4 className="text-sm font-semibold text-zinc-900">{staff.fullName}</h4>
                                  <p className="text-xs text-zinc-500">
                                    {staff.employeeId ? (
                                      <span>ID: {staff.employeeId}</span>
                                    ) : (
                                      <span className="italic text-amber-700 font-medium">ID pending assignment</span>
                                    )}{' '}
                                    · <span className="font-mono">{staff.referenceId}</span>
                                  </p>
                                </div>
                              </div>
                              <AccountStatusBadge status={staff.status} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="size-3.5 text-zinc-400" />
                                <span className="font-medium text-zinc-800">{staff.position}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Building className="size-3.5 text-zinc-400" />
                                <span>{staff.branchName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Mail className="size-3.5 text-zinc-400" />
                                <span className="truncate">{staff.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Phone className="size-3.5 text-zinc-400" />
                                <span>{staff.phone}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3.5 text-zinc-400" />
                                Submitted: {formatDate(staff.createdAt)}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setRejectUser(staff)}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => openApprove(staff)}
                                >
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      </AsyncBoundary>

      {/* Approval & Employee ID Assignment Dialog */}
      <Dialog
        open={Boolean(approveUser)}
        onClose={() => {
          setApproveUser(null);
          setAssignedEmpId('');
          setApproveError('');
        }}
        title="Approve Staff Registration"
        description="Review applicant details and assign an official Employee ID to activate the account."
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
            <Button variant="primary" onClick={handleApprove} loading={approving}>
              Approve & Activate Account
            </Button>
          </>
        }
      >
        {approveUser && (
          <div className="space-y-4 py-2">
            {/* Candidate Review Summary */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={approveUser.fullName} src={approveUser.avatarUrl} size="md" />
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">{approveUser.fullName}</h4>
                    <p className="text-xs text-zinc-500 font-mono">Ref: {approveUser.referenceId || 'N/A'}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle className="size-3 stroke-[2.5]" />
                  Email Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 border-t border-zinc-200/60 pt-2.5">
                <div>
                  <span className="text-zinc-400">Position:</span>{' '}
                  <span className="font-semibold text-zinc-900">{approveUser.position}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Branch:</span>{' '}
                  <span className="font-semibold text-zinc-900">{approveUser.branchName}</span>
                </div>
                <div className="truncate">
                  <span className="text-zinc-400">Email:</span> {approveUser.email}
                </div>
                <div>
                  <span className="text-zinc-400">Phone:</span> {approveUser.phone}
                </div>
              </div>
            </div>

            {/* Manager-controlled Employee ID field */}
            <Field
              label="Official Employee ID"
              error={approveError}
              required
              hint="Enter the official bank employee identifier (e.g. BOA-S012). This will be used by the employee to log in."
            >
              <Input
                value={assignedEmpId}
                onChange={(e) => {
                  setAssignedEmpId(e.target.value);
                  setApproveError('');
                }}
                placeholder="e.g. BOA-S012"
                autoFocus
              />
            </Field>
          </div>
        )}
      </Dialog>

      {/* Rejection Modal Dialog */}
      <Dialog
        open={Boolean(rejectUser)}
        onClose={() => {
          setRejectUser(null);
          setRejectReason('');
          setRejectError('');
        }}
        title="Decline Staff Registration"
        description={`Provide the reason for rejecting ${rejectUser?.fullName}'s registration.`}
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
            <Button variant="danger" onClick={handleReject} loading={rejecting}>
              Decline Application
            </Button>
          </>
        }
      >
        <div className="py-2">
          <Field label="Rejection Reason" error={rejectError} required hint="This message will be visible to the applicant on their status page.">
            <Textarea
              rows={3}
              placeholder="e.g. Employee ID not recognized in branch roster; position mismatch..."
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError('');
              }}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
