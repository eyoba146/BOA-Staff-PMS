import { useState, useEffect } from 'react';
import type { Kpi, User } from '@/types';
import { Dialog, Button, Input, Checkbox, Avatar, Skeleton } from '@/components/ui';
import { Search } from 'lucide-react';

interface AssignKpiDialogProps {
  open: boolean;
  onClose: () => void;
  kpi: Kpi | null;
  staffList: User[];
  assignedStaffIds: string[];
  onSave: (kpiId: string, staffIds: string[]) => Promise<void>;
  loadingStaff?: boolean;
}

export function AssignKpiDialog({
  open,
  onClose,
  kpi,
  staffList,
  assignedStaffIds,
  onSave,
  loadingStaff,
}: AssignKpiDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(assignedStaffIds);
    setSearch('');
  }, [assignedStaffIds, open]);

  if (!kpi) return null;

  const filteredStaff = staffList.filter((s) => {
    const q = search.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q) || s.position.toLowerCase().includes(q);
  });

  const toggleStaff = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedIds(staffList.map((s) => s.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(kpi.id, selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Assign KPI — ${kpi.name}`}
      description="Select staff members who will record daily/periodic performance for this indicator."
      size="md"
      busy={saving}
      footer={
        <>
          <div className="mr-auto text-xs text-zinc-500 self-center">
            {selectedIds.length} of {staffList.length} staff selected
          </div>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save Assignments
          </Button>
        </>
      }
    >
      <div className="space-y-3 py-1">
        <div className="flex items-center gap-2">
          <Input
            leftIcon={<Search />}
            placeholder="Search staff by name, ID, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            onClick={selectAll}
            className="rounded px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="rounded px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            None
          </button>
        </div>

        {loadingStaff ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
            {filteredStaff.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-500">No matching staff found.</p>
            ) : (
              filteredStaff.map((staff) => {
                const checked = selectedIds.includes(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className="flex cursor-pointer items-center justify-between gap-3 p-3 transition-colors hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleStaff(staff.id)}
                        onClick={(e) => e.stopPropagation()}
                        label=""
                      />
                      <Avatar name={staff.fullName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-900">{staff.fullName}</p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {staff.employeeId} · {staff.position}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
