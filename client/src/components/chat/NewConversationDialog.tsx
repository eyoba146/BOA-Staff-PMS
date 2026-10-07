import { useState } from 'react';
import type { User } from '@/types';
import { Dialog, Button, Input, Avatar } from '@/components/ui';
import { Search } from 'lucide-react';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  staffList: User[];
  currentUserId: string;
  onSelectUser: (user: User) => void;
}

export function NewConversationDialog({
  open,
  onClose,
  staffList,
  currentUserId,
  onSelectUser,
}: NewConversationDialogProps) {
  const [search, setSearch] = useState('');

  const colleagues = staffList.filter(
    (u) =>
      u.id !== currentUserId &&
      u.status === 'active' &&
      (u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.position.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Direct Conversation"
      description="Select a branch colleague to start a private messaging thread."
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="space-y-3 py-1">
        <Input
          leftIcon={<Search />}
          placeholder="Search colleague by name or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
          {colleagues.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">No active colleagues found.</p>
          ) : (
            colleagues.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-zinc-50"
              >
                <Avatar name={user.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-900">{user.fullName}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {user.position} ({user.employeeId})
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
