import { Briefcase, Edit2, Plus, Power, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  Field,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { toApiError } from '@/services/http/apiClient';
import { positionService } from '@/services/position.service';
import type { Position } from '@/types';
import { formatDate } from '@/utils/date';

/**
 * Manager Position Management Section.
 * Allows Branch Managers to view, create, rename, and activate/deactivate
 * approved staff positions.
 */
export function PositionManagementSection() {
  const { showToast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Add position modal
  const [addOpen, setAddOpen] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit position modal
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  // Activate / Deactivate confirmation
  const [confirmPos, setConfirmPos] = useState<Position | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await positionService.list();
      setPositions(data);
    } catch {
      showToast({ tone: 'danger', title: 'Error', message: 'Could not load branch positions.' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadPositions();
  }, [loadPositions]);

  // Handle Add Position
  const handleAdd = async () => {
    const cleanName = newPositionName.trim();
    if (!cleanName) {
      setAddError('Position title is required.');
      return;
    }
    if (cleanName.length < 2) {
      setAddError('Position title must be at least 2 characters.');
      return;
    }

    setAdding(true);
    setAddError('');
    try {
      await positionService.create({ name: cleanName });
      showToast({
        tone: 'success',
        title: 'Position created',
        message: `"${cleanName}" has been added to approved branch positions.`,
      });
      setAddOpen(false);
      setNewPositionName('');
      await loadPositions();
    } catch (err) {
      const apiErr = toApiError(err);
      setAddError(apiErr.message);
    } finally {
      setAdding(false);
    }
  };

  // Handle Edit Position
  const handleEdit = async () => {
    if (!editPos) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError('Position title is required.');
      return;
    }
    if (cleanName.length < 2) {
      setEditError('Position title must be at least 2 characters.');
      return;
    }

    setEditing(true);
    setEditError('');
    try {
      await positionService.update(editPos.id, { name: cleanName });
      showToast({
        tone: 'success',
        title: 'Position updated',
        message: `Position renamed to "${cleanName}".`,
      });
      setEditPos(null);
      setEditName('');
      await loadPositions();
    } catch (err) {
      const apiErr = toApiError(err);
      setEditError(apiErr.message);
    } finally {
      setEditing(false);
    }
  };

  // Handle Toggle Status (Activate / Deactivate)
  const handleToggleStatus = async () => {
    if (!confirmPos) return;
    const nextStatus = !confirmPos.isActive;
    setToggling(true);
    try {
      await positionService.setActive(confirmPos.id, nextStatus);
      showToast({
        tone: 'success',
        title: nextStatus ? 'Position activated' : 'Position deactivated',
        message: nextStatus
          ? `"${confirmPos.name}" is now active and selectable for registration.`
          : `"${confirmPos.name}" deactivated. Existing staff retain their positions.`,
      });
      setConfirmPos(null);
      await loadPositions();
    } catch (err) {
      const apiErr = toApiError(err);
      showToast({ tone: 'danger', title: 'Update failed', message: apiErr.message });
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Branch Staff Positions"
        description="Manage the approved position titles available for new staff registrations and staff profiles."
        actions={
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="size-4" />}
            onClick={() => {
              setAddOpen(true);
              setNewPositionName('');
              setAddError('');
            }}
          >
            Add Position
          </Button>
        }
      />
      <CardBody className="p-0 sm:p-0">
        <Table>
          <THead>
            <TR>
              <TH>Position Title</TH>
              <TH>Status</TH>
              <TH align="center">Enrolled Staff</TH>
              <TH>Last Updated</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-sm text-zinc-400">
                  Loading branch positions...
                </TD>
              </TR>
            ) : positions.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                  No positions configured yet. Click &quot;Add Position&quot; to define your first approved role.
                </TD>
              </TR>
            ) : (
              positions.map((pos) => (
                <TR key={pos.id}>
                  <TD>
                    <div className="flex items-center gap-2 font-medium text-zinc-900">
                      <Briefcase className="size-4 text-zinc-400 shrink-0" />
                      <span>{pos.name}</span>
                    </div>
                  </TD>
                  <TD>
                    {pos.isActive ? (
                      <Badge tone="success" dot>
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        Inactive
                      </Badge>
                    )}
                  </TD>
                  <TD align="center">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      <Users className="size-3 text-zinc-500" />
                      {pos.assignedStaffCount ?? 0} {pos.assignedStaffCount === 1 ? 'member' : 'members'}
                    </span>
                  </TD>
                  <TD className="text-xs text-zinc-500">{formatDate(pos.updatedAt)}</TD>
                  <TD align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Edit2 className="size-3.5" />}
                        onClick={() => {
                          setEditPos(pos);
                          setEditName(pos.name);
                          setEditError('');
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Power className="size-3.5" />}
                        onClick={() => setConfirmPos(pos)}
                      >
                        {pos.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>

      {/* Add Position Modal Dialog */}
      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setNewPositionName('');
          setAddError('');
        }}
        title="Add Approved Position"
        description="Create a new position title that will become available for staff self-registration."
        size="sm"
        busy={adding}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAddOpen(false);
                setNewPositionName('');
                setAddError('');
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={adding}>
              Add Position
            </Button>
          </>
        }
      >
        <div className="py-2">
          <Field
            label="Position Title"
            error={addError}
            required
            hint="e.g. Senior Customer Service Officer, Loan Specialist..."
          >
            <Input
              value={newPositionName}
              onChange={(e) => {
                setNewPositionName(e.target.value);
                setAddError('');
              }}
              placeholder="e.g. Relationship Officer"
              autoFocus
            />
          </Field>
        </div>
      </Dialog>

      {/* Edit Position Modal Dialog */}
      <Dialog
        open={Boolean(editPos)}
        onClose={() => {
          setEditPos(null);
          setEditName('');
          setEditError('');
        }}
        title="Edit Position Title"
        description="Rename this approved branch position. Existing enrolled staff will remain assigned."
        size="sm"
        busy={editing}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditPos(null);
                setEditName('');
                setEditError('');
              }}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEdit} loading={editing}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="py-2">
          <Field label="Position Title" error={editError} required>
            <Input
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError('');
              }}
              autoFocus
            />
          </Field>
        </div>
      </Dialog>

      {/* Activate / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmPos)}
        onCancel={() => setConfirmPos(null)}
        onConfirm={handleToggleStatus}
        title={confirmPos?.isActive ? 'Deactivate Position' : 'Activate Position'}
        description={
          confirmPos?.isActive
            ? `Are you sure you want to deactivate "${confirmPos.name}"? It will no longer appear as an option for new staff registrations. Existing staff who currently hold this position will keep their position.`
            : `Are you sure you want to activate "${confirmPos?.name}"? It will immediately become available as an approved option for new staff registrations.`
        }
        confirmLabel={confirmPos?.isActive ? 'Deactivate Position' : 'Activate Position'}
        destructive={confirmPos?.isActive}
        loading={toggling}
      />
    </Card>
  );
}
