import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ArrowRight, MessageSquareText } from 'lucide-react';
import { staffService } from '@/services/staff.service';
import { feedbackService } from '@/services/feedback.service';
import { kpiService } from '@/services/kpi.service';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary } from '@/components/shared';
import {
  Card,
  Button,
  Input,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Avatar,
  AccountStatusBadge,
  EmptyState,
} from '@/components/ui';
import type { FeedbackInput, User } from '@/types';
import { GiveFeedbackDialog } from '@/components/feedback/GiveFeedbackDialog';

export function CemStaffListPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [giveFeedbackOpen, setGiveFeedbackOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  const loadData = useCallback(async () => {
    const [inScopeStaff, kpis] = await Promise.all([
      staffService.listInScope(),
      kpiService.list().catch(() => []),
    ]);
    return { inScopeStaff, kpis };
  }, []);

  const state = useAsync(loadData, [loadData]);

  const handleCreateFeedback = async (data: FeedbackInput) => {
    try {
      await feedbackService.create(data);
      showToast({
        tone: 'gold',
        title: 'Feedback Sent',
        message: 'Coaching guidance has been recorded and dispatched.',
      });
      setGiveFeedbackOpen(false);
    } catch (err: any) {
      showToast({
        tone: 'danger',
        title: 'Error',
        message: err?.message || 'Failed to dispatch feedback.',
      });
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervised Staff Directory"
        description="Active officers assigned to your Customer Experience supervision scope."
        documentTitle="Staff in Scope"
      />

      <AsyncBoundary state={state}>
        {({ inScopeStaff, kpis }) => {
          const filtered = inScopeStaff.filter((s) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
              s.fullName.toLowerCase().includes(q) ||
              s.employeeId.toLowerCase().includes(q) ||
              s.position.toLowerCase().includes(q)
            );
          });

          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Search by name, ID, or position..."
                    leftIcon={<Search className="size-4 text-zinc-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  {filtered.length} staff member{filtered.length === 1 ? '' : 's'} in scope
                </div>
              </div>

              {filtered.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={Users}
                    title="No staff members found"
                    description={
                      search
                        ? 'No officers matched your search criteria.'
                        : 'No staff members have been assigned to your supervision scope yet.'
                    }
                  />
                </Card>
              ) : (
                <Card>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Staff Officer</TH>
                        <TH>Position</TH>
                        <TH hideBelow="md">Branch</TH>
                        <TH align="center">Account Status</TH>
                        <TH align="right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {filtered.map((staff) => (
                        <TR key={staff.id} interactive>
                          <TD>
                            <Link
                              to={`/cem/staff/${staff.id}`}
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
                          <TD hideBelow="md" className="text-xs text-zinc-500">
                            {staff.branchName}
                          </TD>
                          <TD align="center">
                            <AccountStatusBadge status={staff.status} />
                          </TD>
                          <TD align="right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<MessageSquareText className="size-3.5" />}
                                onClick={() => {
                                  setSelectedStaff(staff);
                                  setGiveFeedbackOpen(true);
                                }}
                              >
                                Coach
                              </Button>
                              <Link to={`/cem/staff/${staff.id}`}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  rightIcon={<ArrowRight className="size-3.5" />}
                                >
                                  Performance
                                </Button>
                              </Link>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </Card>
              )}

              <GiveFeedbackDialog
                open={giveFeedbackOpen}
                onClose={() => setGiveFeedbackOpen(false)}
                staffList={inScopeStaff}
                kpis={kpis}
                defaultStaffId={selectedStaff?.id}
                onSubmit={handleCreateFeedback}
              />
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
