import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import {
  Send,
  Plus,
  Search,
  MessageSquare,
  Users,
  ChevronLeft,
  Building2,
  Lock,
  Pencil,
  Trash2,
  ShieldCheck,
  Pin,
  ShieldAlert,
} from 'lucide-react';
import { useCurrentUser } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { chatService, type ChatContact } from '@/services/chat.service';
import { realtimeService } from '@/services/realtime.service';
import { useAsync } from '@/hooks/useAsync';
import { PageHeader, ConfirmDialog } from '@/components/shared';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { Avatar, Button, Input, SkeletonRows, EmptyState, Dialog, Field } from '@/components/ui';
import type { ChatMessage } from '@/types';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/utils/cn';

export function ChatPage() {
  const currentUser = useCurrentUser();
  const { showToast } = useToast();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');

  // Editing state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Deleting state
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Moderation state
  const [moderateTarget, setModerateTarget] = useState<ChatMessage | null>(null);
  const [moderateReason, setModerateReason] = useState('');
  const [moderating, setModerating] = useState(false);

  // Mobile pane toggling: true = show thread on mobile
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  // New conversation dialog
  const [newDialogOpened, setNewDialogOpened] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    return chatService.listConversations();
  }, []);

  const convsState = useAsync(loadConversations, [loadConversations]);

  // Load colleagues for new conversation dialog
  useEffect(() => {
    void chatService.getContacts().then(setContacts);
  }, []);

  // Default select first conversation (usually Branch Room) on initial load
  useEffect(() => {
    if (convsState.data && convsState.data.length > 0 && !activeConvId) {
      setActiveConvId(convsState.data[0].id);
    }
  }, [convsState.data, activeConvId]);

  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const setConvsDataRef = useRef(convsState.setData);
  useEffect(() => {
    setConvsDataRef.current = convsState.setData;
  }, [convsState.setData]);

  const isSendingRef = useRef(false);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    let cancelled = false;
    setLoadingMessages(true);
    setEditingMsgId(null);
    setEditingText('');
    void chatService.getMessages(activeConvId).then((res) => {
      if (!cancelled) {
        const seen = new Set<string>();
        const unique = res.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        setMessages(unique);
        setLoadingMessages(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  // Real-time SSE Live Message Listener (no polling!)
  useEffect(() => {
    const unsubMsg = realtimeService.on('chat_message', (newMsg: ChatMessage) => {
      if (newMsg.conversationId === activeConvIdRef.current) {
        setMessages((prev) => {
          // If already in list by id, nothing to do
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // Check if there is an optimistic temp message matching this body and sender
          const tempIdx = prev.findIndex(
            (m) => m.id.startsWith('temp_') && m.senderId === newMsg.senderId && m.body === newMsg.body,
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = newMsg;
            return next;
          }

          return [...prev, newMsg];
        });
      }

      setConvsDataRef.current((prev) =>
        prev?.map((c) => {
          if (c.id === newMsg.conversationId) {
            const isCurrentlyActive = c.id === activeConvIdRef.current;
            return {
              ...c,
              lastMessage: newMsg,
              unreadCount: isCurrentlyActive ? 0 : c.unreadCount + 1,
              updatedAt: newMsg.sentAt,
            };
          }
          return c;
        }),
      );
    });

    const unsubEdit = realtimeService.on('chat_message_updated', (updatedMsg: ChatMessage) => {
      if (updatedMsg.conversationId === activeConvIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
        );
      }
      setConvsDataRef.current((prev) =>
        prev?.map((c) => {
          if (c.id === updatedMsg.conversationId && c.lastMessage?.id === updatedMsg.id) {
            return { ...c, lastMessage: updatedMsg };
          }
          return c;
        }),
      );
    });

    const unsubDel = realtimeService.on(
      'chat_message_deleted',
      ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
        if (conversationId === activeConvIdRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
      },
    );

    return () => {
      unsubMsg();
      unsubEdit();
      unsubDel();
    };
  }, []);

  const activeConversation = convsState.data?.find((c) => c.id === activeConvId);

  const handleSendMessage = async () => {
    if (!activeConvId || !messageText.trim() || isSendingRef.current) return;
    const body = messageText.trim();
    isSendingRef.current = true;
    setMessageText('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConvId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      senderPosition: currentUser.role === 'manager' ? 'Branch Manager' : (currentUser.position || 'Staff'),
      body,
      sentAt: new Date().toISOString(),
      editedAt: null,
    };

    // Instant UI update (0ms latency)
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 10);

    // Update sidebar snippet immediately
    convsState.setData((prev) =>
      prev?.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              lastMessage: optimisticMsg,
              updatedAt: optimisticMsg.sentAt,
            }
          : c,
      ),
    );

    try {
      const realMsg = await chatService.sendMessage(activeConvId, body);

      // Reconcile optimistic message with verified server message
      setMessages((prev) => {
        // If already added by real-time SSE, drop the temp message
        if (prev.some((m) => m.id === realMsg.id)) {
          return prev.filter((m) => m.id !== tempId);
        }
        // Upgrade temp message in place
        return prev.map((m) => (m.id === tempId ? realMsg : m));
      });

      convsState.setData((prev) =>
        prev?.map((c) =>
          c.id === activeConvId && (c.lastMessage?.id === tempId || c.lastMessage?.id === realMsg.id)
            ? {
                ...c,
                lastMessage: realMsg,
                updatedAt: realMsg.sentAt,
              }
            : c,
        ),
      );
    } catch {
      // Revert optimistic message and restore input on network error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageText(body);
      showToast({ tone: 'danger', title: 'Failed to send', message: 'Could not deliver your message. Please try again.' });
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditingText(msg.body);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!activeConvId || !editingText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await chatService.editMessage(activeConvId, msgId, editingText.trim());
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));

      // Sync conversation snippet if it's the last message
      convsState.setData((prev) =>
        prev?.map((c) =>
          c.id === activeConvId && c.lastMessage?.id === msgId
            ? { ...c, lastMessage: updated }
            : c,
        ),
      );
      handleCancelEdit();
      showToast({ tone: 'gold', title: 'Message updated', message: 'Your changes have been saved to the conversation.' });
    } catch {
      showToast({ tone: 'danger', title: 'Edit failed', message: 'Could not update your message.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeConvId || !deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await chatService.deleteMessage(activeConvId, deleteTarget.id);
      const remainingMessages = messages.filter((m) => m.id !== deleteTarget.id);
      setMessages(remainingMessages);

      // Sync conversation snippet if this was the last message
      convsState.setData((prev) =>
        prev?.map((c) => {
          if (c.id === activeConvId && c.lastMessage?.id === deleteTarget.id) {
            const newLast = remainingMessages.at(-1) ?? null;
            return {
              ...c,
              lastMessage: newLast,
              updatedAt: newLast?.sentAt ?? c.updatedAt,
            };
          }
          return c;
        }),
      );
      setDeleteTarget(null);
      showToast({ tone: 'gold', title: 'Message deleted', message: 'The message was removed from the conversation.' });
    } catch {
      showToast({ tone: 'danger', title: 'Delete failed', message: 'Could not delete message.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSendingRef.current) {
        void handleSendMessage();
      }
    }
  };

  const handleStartConversationWithUser = async (targetUser: ChatContact) => {
    try {
      const conv = await chatService.startDirect(targetUser.id);
      await convsState.reload();
      setActiveConvId(conv.id);
      setShowThreadOnMobile(true);
    } catch {
      showToast({ tone: 'danger', title: 'Error', message: 'Could not create conversation.' });
    }
  };

  const handleCreateGroup = async (title: string, participantIds: string[], description?: string) => {
    try {
      const group = await chatService.createGroup(title, participantIds, description);
      await convsState.reload();
      setActiveConvId(group.id);
      setShowThreadOnMobile(true);
      showToast({ tone: 'gold', title: 'Group Created', message: `Group "${title}" created successfully.` });
    } catch (err: any) {
      showToast({ tone: 'danger', title: 'Error', message: err?.message || 'Failed to create group.' });
    }
  };

  const handlePinMessage = async (msg: ChatMessage) => {
    if (!activeConvId) return;
    try {
      const updated = await chatService.pinMessage(activeConvId, msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isPinned: updated.isPinned } : m)));
      showToast({
        tone: 'gold',
        title: updated.isPinned ? 'Message Pinned' : 'Message Unpinned',
        message: updated.isPinned ? 'Message pinned to group conversation.' : 'Message unpinned.',
      });
    } catch (err: any) {
      showToast({ tone: 'danger', title: 'Pin Error', message: err?.message || 'Could not pin message.' });
    }
  };

  const handleModerateMessage = async () => {
    if (!activeConvId || !moderateTarget) return;
    setModerating(true);
    try {
      const updated = await chatService.moderateMessage(activeConvId, moderateTarget.id, moderateReason);
      setMessages((prev) => prev.map((m) => (m.id === moderateTarget.id ? { ...m, ...updated } : m)));
      showToast({ tone: 'gold', title: 'Message Moderated', message: 'Message was removed for branch policy compliance.' });
      setModerateTarget(null);
      setModerateReason('');
    } catch (err: any) {
      showToast({ tone: 'danger', title: 'Moderation Error', message: err?.message || 'Failed to moderate message.' });
    } finally {
      setModerating(false);
    }
  };

  const filteredConversations = (convsState.data ?? []).filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] sm:h-[calc(100dvh-7.5rem)] flex-col space-y-2 sm:space-y-3">
      <PageHeader
        title="Branch Chat"
        description="Internal branch room and direct messaging for staff coordination and operational inquiries."
        documentTitle="Internal Chat"
      />

      {/* Chat Container */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs">
        {/* Left Pane: Conversations List */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-zinc-200 bg-zinc-50/50 md:w-80 md:flex',
            showThreadOnMobile ? 'hidden md:flex' : 'flex',
          )}
        >
          {/* List Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white p-3">
            <h2 className="text-sm font-semibold text-zinc-900">Conversations</h2>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="size-3.5" />}
              onClick={() => setNewDialogOpened(true)}
            >
              New Message
            </Button>
          </div>

          {/* Search bar */}
          <div className="border-b border-zinc-200 p-2.5 bg-white">
            <Input
              leftIcon={<Search className="size-4 text-zinc-400" />}
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {convsState.loading ? (
              <div className="p-3">
                <SkeletonRows rows={4} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-500">No conversations found.</p>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                const isBranch = conv.type === 'branch';

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowThreadOnMobile(true);
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 p-3 text-left transition-colors',
                      isSelected ? 'bg-gold-50/80 border-l-3 border-l-gold-500' : 'hover:bg-zinc-100/70',
                    )}
                  >
                    {isBranch ? (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-gold-400">
                        <Building2 className="size-4" />
                      </div>
                    ) : (
                      <Avatar name={conv.title} size="sm" className="size-9" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-xs font-semibold text-zinc-900">
                            {conv.title}
                          </span>
                          {!isBranch && (() => {
                            const other = conv.participants.find((p) => p.id !== currentUser.id);
                            if (other?.role === 'manager') {
                              return (
                                <span className="inline-flex items-center gap-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 border border-amber-300">
                                  <ShieldCheck className="size-2.5 text-amber-800" /> Manager
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {conv.lastMessage && (
                          <span className="shrink-0 text-[10px] text-zinc-400">
                            {formatDateTime(conv.lastMessage.sentAt).split(',')[1]?.trim() || ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {conv.lastMessage
                          ? `${conv.lastMessage.senderName}: ${conv.lastMessage.body}`
                          : 'No messages yet'}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Message Thread */}
        <div
          className={cn(
            'flex flex-1 flex-col bg-white',
            !showThreadOnMobile ? 'hidden md:flex' : 'flex',
          )}
        >
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowThreadOnMobile(false)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 md:hidden"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  {activeConversation.type === 'branch' ? (
                    <div className="flex size-8 items-center justify-center rounded-md bg-ink-900 text-gold-400">
                      <Building2 className="size-4" />
                    </div>
                  ) : (
                    <Avatar name={activeConversation.title} size="sm" />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-xs font-semibold text-zinc-900">
                        {activeConversation.title}
                      </h3>
                      {activeConversation.type !== 'branch' && (() => {
                        const other = activeConversation.participants.find((p) => p.id !== currentUser.id);
                        if (other?.role === 'manager') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-gold-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-400/60 shadow-xs">
                              <ShieldCheck className="size-3 text-amber-800" /> Branch Manager
                            </span>
                          );
                        }
                        if (other?.position) {
                          return (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200">
                              {other.position}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      {activeConversation.type === 'branch' ? (
                        <>
                          <Users className="size-3 text-gold-600" /> Official Branch Room • All Active Staff & Management
                        </>
                      ) : (
                        <>
                          <Lock className="size-3 text-zinc-400" /> Direct Private Message
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="p-4">
                    <SkeletonRows rows={3} />
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    description="Be the first to send a message in this conversation."
                  />
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isPending = msg.id.startsWith('temp_');
                    const canEdit = isMe && !isPending;
                    const canDelete = (isMe || currentUser.role === 'manager') && !isPending;
                    const isModerator = (currentUser.role === 'manager' || currentUser.role === 'customer_experience_manager') && activeConversation?.type !== 'direct';
                    const prevMsg = messages[i - 1];
                    const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
                    const isEditingThis = editingMsgId === msg.id;
                    const isManager = msg.senderRole === 'manager';
                    const isCem = msg.senderRole === 'customer_experience_manager';

                    return (
                      <div
                        key={msg.id}
                        className={cn('group relative flex flex-col', isMe ? 'items-end' : 'items-start')}
                      >
                        {!isSameSender && (
                          <div className={cn('mb-1 flex items-center gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
                            <span className="text-[11px] font-semibold text-zinc-700">
                              {isMe ? 'You' : msg.senderName}
                            </span>
                            {isManager ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-gold-500/35 px-2 py-0.5 text-[9.5px] font-bold text-amber-950 border border-amber-400/60 shadow-xs">
                                <ShieldCheck className="size-2.5 text-amber-800" /> Branch Manager
                              </span>
                            ) : isCem ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold text-amber-900 border border-amber-300 shadow-xs">
                                <ShieldCheck className="size-2.5 text-amber-700" /> Customer Experience Manager
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9.5px] font-medium text-zinc-600 border border-zinc-200">
                                {msg.senderPosition || 'Staff'}
                              </span>
                            )}
                          </div>
                        )}

                        {isEditingThis ? (
                          <div
                            className={cn(
                              'w-full max-w-md rounded-lg p-3 shadow-md transition-all',
                              isMe
                                ? 'bg-ink-900 border border-gold-500/50 ring-1 ring-gold-500/30 text-white'
                                : 'bg-white border border-zinc-300 text-zinc-900',
                            )}
                          >
                            <div className="mb-1.5 flex items-center justify-between">
                              <span
                                className={cn(
                                  'flex items-center gap-1.5 text-[11px] font-semibold',
                                  isMe ? 'text-gold-400' : 'text-zinc-700',
                                )}
                              >
                                <Pencil className="size-3 text-gold-500" />
                                Edit Message
                              </span>
                              <span
                                className={cn(
                                  'text-[10px]',
                                  isMe ? 'text-ink-400' : 'text-zinc-400',
                                )}
                              >
                                Enter to save • Esc to cancel
                              </span>
                            </div>

                            <textarea
                              rows={2}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  void handleSaveEdit(msg.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                              className={cn(
                                'w-full resize-none rounded-md p-2 text-xs transition-colors focus:outline-none focus:ring-1',
                                isMe
                                  ? 'bg-ink-800 border border-ink-700 text-white placeholder-ink-400 focus:border-gold-500 focus:ring-gold-500'
                                  : 'bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-ink-900 focus:ring-ink-900',
                              )}
                            />

                            <div className="mt-2.5 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                                className={cn(
                                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                                  isMe
                                    ? 'text-ink-300 hover:text-white hover:bg-ink-800'
                                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
                                )}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(msg.id)}
                                disabled={savingEdit || !editingText.trim()}
                                className="flex items-center gap-1 rounded bg-gold-500 px-3 py-1 text-xs font-semibold text-ink-950 shadow-xs transition hover:bg-gold-400 active:scale-95 disabled:opacity-50"
                              >
                                {savingEdit ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'flex items-center gap-1.5',
                              isMe ? 'flex-row' : 'flex-row-reverse',
                            )}
                          >
                            {/* Quick Action buttons (Edit, Delete, Pin, Moderate) */}
                            {(canEdit || canDelete || isModerator) && (
                              <div
                                className={cn(
                                  'flex items-center gap-0.5 rounded-md border border-zinc-200/90 bg-white px-1 py-0.5 shadow-xs transition-opacity',
                                  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100',
                                )}
                              >
                                {isModerator && (
                                  <button
                                    type="button"
                                    onClick={() => void handlePinMessage(msg)}
                                    className={cn(
                                      'rounded p-1 text-zinc-400 transition-colors hover:bg-gold-50 hover:text-gold-700',
                                      msg.isPinned && 'text-gold-600 font-bold',
                                    )}
                                    title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                                  >
                                    <Pin className="size-3.5" />
                                  </button>
                                )}
                                {isModerator && !isMe && !msg.isModerated && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModerateTarget(msg);
                                      setModerateReason('');
                                    }}
                                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
                                    title="Moderate inappropriate message"
                                  >
                                    <ShieldAlert className="size-3.5" />
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(msg)}
                                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                                    title="Edit message"
                                    aria-label="Edit message"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(msg)}
                                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                    title={isMe ? 'Delete message' : 'Delete message (Moderation)'}
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={cn(
                                'max-w-[85%] sm:max-w-[80%] rounded-lg px-3.5 py-2 text-xs leading-relaxed shadow-xs transition-all',
                                isMe
                                  ? cn(
                                    'bg-ink-900 text-white rounded-br-none',
                                    msg.editedAt && 'border border-gold-500/40 ring-1 ring-gold-500/25',
                                  )
                                  : cn(
                                    'bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-bl-none',
                                    msg.editedAt && 'border-l-2 border-l-gold-500',
                                  ),
                                isPending && 'opacity-70',
                              )}
                            >
                              {msg.isPinned && (
                                <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-gold-700 border-b border-gold-200/50 pb-0.5">
                                  <Pin className="size-2.5 fill-gold-600" />
                                  <span>Pinned</span>
                                </div>
                              )}
                              {msg.isModerated ? (
                                <div className="rounded border border-amber-200 bg-amber-50/70 p-2 text-xs italic text-amber-900 flex items-center gap-1.5">
                                  <ShieldAlert className="size-3.5 text-amber-700 shrink-0" />
                                  <span>{msg.body}</span>
                                </div>
                              ) : (
                                <p className="whitespace-pre-line">{msg.body}</p>
                              )}
                              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px]">
                                {msg.editedAt && (
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-0.5 font-medium',
                                      isMe ? 'text-gold-400 font-semibold' : 'text-gold-600 font-medium',
                                    )}
                                  >
                                    <Pencil className="size-2.5 inline" />
                                    (edited)
                                  </span>
                                )}
                                <span className={isMe ? 'text-zinc-400' : 'text-zinc-500'}>
                                  {isPending ? 'Sending...' : (formatDateTime(msg.sentAt).split(',')[1]?.trim() || '')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="border-t border-zinc-200 p-2.5 sm:p-3 bg-zinc-50/70">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 resize-none rounded-md border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-zinc-400 text-xs">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={newDialogOpened}
        onClose={() => setNewDialogOpened(false)}
        contacts={contacts}
        currentUserId={currentUser.id}
        canCreateGroup={currentUser.role === 'manager' || currentUser.role === 'customer_experience_manager'}
        onSelectUser={handleStartConversationWithUser}
        onCreateGroup={handleCreateGroup}
      />

      {/* Delete Message Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Message"
        description="Are you sure you want to delete this message? This message will be permanently removed for all participants."
        confirmLabel="Delete Message"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Moderate Message Dialog */}
      <Dialog
        open={Boolean(moderateTarget)}
        onClose={() => setModerateTarget(null)}
        title="Moderate Message"
        description={`Remove message sent by ${moderateTarget?.senderName} and replace it with an official moderation notice for branch policy compliance.`}
        size="sm"
        busy={moderating}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModerateTarget(null)} disabled={moderating}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleModerateMessage}
              loading={moderating}
            >
              Confirm Moderation
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          {moderateTarget && (
            <div className="rounded bg-zinc-100 p-2 text-xs text-zinc-700 italic border border-zinc-200">
              &quot;{moderateTarget.body}&quot;
            </div>
          )}
          <Field label="Moderation Reason (Recorded in Audit Log)" required>
            <Input
              placeholder="e.g. Inappropriate language, off-topic, unprofessional communication"
              value={moderateReason}
              onChange={(e) => setModerateReason(e.target.value)}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

