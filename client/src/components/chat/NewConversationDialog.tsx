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
  canCreateGroup?: boolean;
  onSelectUser: (user: ChatContact) => void;
  onCreateGroup?: (title: string, participantIds: string[], description?: string) => Promise<void>;
}

export function NewConversationDialog({
  open,
  onClose,
  contacts,
  currentUserId,
  canCreateGroup,
  onSelectUser,
  onCreateGroup,
}: NewConversationDialogProps) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [submittingGroup, setSubmittingGroup] = useState(false);

  const filteredContacts = contacts.filter(
    (u) =>
      u.id !== currentUserId &&
      (u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (u.position && u.position.toLowerCase().includes(search.toLowerCase())) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase()))),
  );

  const handleCreateGroup = async () => {
    if (!groupTitle.trim() || selectedMemberIds.length === 0 || !onCreateGroup) return;
    setSubmittingGroup(true);
    try {
      await onCreateGroup(groupTitle.trim(), selectedMemberIds, groupDescription.trim() || undefined);
      setGroupTitle('');
      setGroupDescription('');
      setSelectedMemberIds([]);
      onClose();
    } finally {
      setSubmittingGroup(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tab === 'direct' ? 'New Direct Conversation' : 'Create Group Conversation'}
      description={
        tab === 'direct'
          ? 'Select a branch colleague or manager to start a private messaging thread.'
          : 'Create a collaborative work group for staff within your supervision scope.'
      }
      size="md"
      busy={submittingGroup}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={submittingGroup}>
            Cancel
          </Button>
          {tab === 'group' && (
            <Button
              variant="primary"
              onClick={handleCreateGroup}
              disabled={!groupTitle.trim() || selectedMemberIds.length === 0 || submittingGroup}
              loading={submittingGroup}
            >
              Create Group ({selectedMemberIds.length})
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3 py-1">
        {canCreateGroup && (
          <div className="flex border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setTab('direct')}
              className={cn(
                'px-4 py-2 text-xs font-semibold border-b-2 transition-colors',
                tab === 'direct'
                  ? 'border-gold-500 text-gold-900 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800',
              )}
            >
              Direct Message
            </button>
            <button
              type="button"
              onClick={() => setTab('group')}
              className={cn(
                'px-4 py-2 text-xs font-semibold border-b-2 transition-colors',
                tab === 'group'
                  ? 'border-gold-500 text-gold-900 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800',
              )}
            >
              Group Conversation
            </button>
          </div>
        )}

        {tab === 'group' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-800">Group Title *</label>
              <Input
                placeholder="e.g. Customer Service Team, Vault Operations"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-800">Description (Optional)</label>
              <Input
                placeholder="Purpose of this group conversation..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </div>
            <label className="text-xs font-semibold text-zinc-800 block">Select Group Members *</label>
          </div>
        )}

        <Input
          leftIcon={<Search />}
          placeholder="Search colleague by name or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
          {filteredContacts.length === 0 ? (
            <p className="p-4 text-center text-xs text-zinc-500">No active colleagues found.</p>
          ) : (
            filteredContacts.map((contact) => {
              const isManager = contact.role === 'manager';
              const isCem = contact.role === 'customer_experience_manager';
              const isSelected = selectedMemberIds.includes(contact.id);

              if (tab === 'group') {
                return (
                  <label
                    key={contact.id}
                    className="flex w-full items-center gap-3 p-2.5 text-left transition-colors cursor-pointer hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemberIds([...selectedMemberIds, contact.id]);
                        } else {
                          setSelectedMemberIds(selectedMemberIds.filter((id) => id !== contact.id));
                        }
                      }}
                      className="rounded border-zinc-300 text-gold-600 focus:ring-gold-500"
                    />
                    <Avatar name={contact.fullName} size="sm" src={contact.avatarUrl ?? undefined} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-zinc-900">{contact.fullName}</p>
                        {isManager && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                            Manager
                          </span>
                        )}
                        {isCem && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                            CEM
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-zinc-500">
                        {contact.position} {contact.employeeId ? `(${contact.employeeId})` : ''}
                      </p>
                    </div>
                  </label>
                );
              }

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
                      {isCem && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-300">
                          <ShieldCheck className="size-2.5 text-amber-700" /> CEM
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
