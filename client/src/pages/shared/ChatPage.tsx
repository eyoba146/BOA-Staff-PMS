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
} from 'lucide-react';
import { useCurrentUser } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { chatService } from '@/services/chat.service';
import { staffService } from '@/services/staff.service';
import { useAsync } from '@/hooks/useAsync';
import { PageHeader } from '@/components/shared';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { Avatar, Button, Input, SkeletonRows, EmptyState } from '@/components/ui';
import type { ChatMessage, User } from '@/types';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/utils/cn';

export function ChatPage() {
  const currentUser = useCurrentUser();
  const { showToast } = useToast();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  // Mobile pane toggling: true = show thread on mobile
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  // New conversation dialog
  const [newDialogOpened, setNewDialogOpened] = useState(false);
  const [staffList, setStaffList] = useState<User[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    return chatService.listConversations();
  }, []);

  const convsState = useAsync(loadConversations, [loadConversations]);

  // Load colleagues for new conversation dialog
  useEffect(() => {
    void staffService.list({ status: 'active' }).then(setStaffList);
  }, []);

  // Default select first conversation (usually Branch Room) on initial load
  useEffect(() => {
    if (convsState.data && convsState.data.length > 0 && !activeConvId) {
      setActiveConvId(convsState.data[0].id);
    }
  }, [convsState.data, activeConvId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    let cancelled = false;
    setLoadingMessages(true);
    void chatService.getMessages(activeConvId).then((res) => {
      if (!cancelled) {
        setMessages(res);
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

  const activeConversation = convsState.data?.find((c) => c.id === activeConvId);

  const handleSendMessage = async () => {
    if (!activeConvId || !messageText.trim() || sending) return;
    const body = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const newMsg = await chatService.sendMessage(activeConvId, body);
      setMessages((prev) => [...prev, newMsg]);

      // update conversation snippet
      convsState.setData((prev) =>
        prev?.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                lastMessage: newMsg,
                updatedAt: newMsg.sentAt,
              }
            : c,
        ),
      );
    } catch {
      showToast({ tone: 'danger', title: 'Failed to send', message: 'Could not deliver your message.' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleStartConversationWithUser = async (targetUser: User) => {
    try {
      const conv = await chatService.startDirect(targetUser.id);
      await convsState.reload();
      setActiveConvId(conv.id);
      setShowThreadOnMobile(true);
    } catch {
      showToast({ tone: 'danger', title: 'Error', message: 'Could not create conversation.' });
    }
  };

  const filteredConversations = (convsState.data ?? []).filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col space-y-3">
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
                        <span className="truncate text-xs font-semibold text-zinc-900">
                          {conv.title}
                        </span>
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
                    <h3 className="truncate text-xs font-semibold text-zinc-900">
                      {activeConversation.title}
                    </h3>
                    <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      {activeConversation.type === 'branch' ? (
                        <>
                          <Users className="size-3" /> Branch-wide room
                        </>
                      ) : (
                        <>
                          <Lock className="size-3" /> Direct message
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
                    const prevMsg = messages[i - 1];
                    const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                      >
                        {!isSameSender && !isMe && (
                          <span className="mb-1 text-[11px] font-medium text-zinc-600">
                            {msg.senderName}
                          </span>
                        )}

                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-3.5 py-2 text-xs leading-relaxed shadow-xs',
                            isMe
                              ? 'bg-ink-900 text-white rounded-br-none'
                              : 'bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-bl-none',
                          )}
                        >
                          <p className="whitespace-pre-line">{msg.body}</p>
                          <span
                            className={cn(
                              'mt-1 block text-[10px] text-right',
                              isMe ? 'text-zinc-400' : 'text-zinc-500',
                            )}
                          >
                            {formatDateTime(msg.sentAt).split(',')[1]?.trim() || ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="border-t border-zinc-200 p-3 bg-zinc-50/70">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
                    className="flex-1 resize-none rounded-md border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    loading={sending}
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
        staffList={staffList}
        currentUserId={currentUser.id}
        onSelectUser={handleStartConversationWithUser}
      />
    </div>
  );
}
