import { useState } from 'react';
import type { ChatContact } from '@/services/chat.service';
import { Dialog, Button, Input, Avatar } from '@/components/ui';
import { Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  contacts: ChatContact[];
  currentUserId: string;
  onSelectUser: (user: ChatContact) => void;
}

export function NewConversationDialog({
  open,
  onClose,
  contacts,
  currentUserId,
  onSelectUser,
}: NewConversationDialogProps) {
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(
    (u) =>
      u.id !== currentUserId &&
      (u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (u.position && u.position.toLowerCase().includes(search.toLowerCase())) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase()))),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Direct Conversation"
      description="Select a branch colleague or manager to start a private messaging thread."
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
          {filteredContacts.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">No active colleagues found.</p>
          ) : (
            filteredContacts.map((contact) => {
              const isManager = contact.role === 'manager';
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => {
                    onSelectUser(contact);
                    onClose();
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 p-3 text-left transition-colors cursor-pointer',
                    isManager
                      ? 'bg-amber-50/50 hover:bg-amber-100/60'
                      : 'hover:bg-zinc-50',
                  )}
                >
                  <Avatar name={contact.fullName} size="sm" src={contact.avatarUrl ?? undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-zinc-900">{contact.fullName}</p>
                      {isManager && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-gold-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 border border-amber-400/50 shadow-xs">
                          <ShieldCheck className="size-2.5 text-amber-800" /> Branch Manager
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-zinc-500">
                      {contact.position} {contact.employeeId ? `(${contact.employeeId})` : ''}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
