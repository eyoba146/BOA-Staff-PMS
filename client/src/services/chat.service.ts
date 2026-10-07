import { env } from '@/config/env';
import type { ChatMessage, Conversation } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';
import type { MockDb, StoredConversation } from './mock/seed';

/**
 * Internal chat. Currently request/response with UI polling (ASSUMPTION).
 * Socket.IO live events can later be added behind this same interface (SRS §8).
 */
export interface ChatService {
  listConversations(): Promise<Conversation[]>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  sendMessage(conversationId: string, body: string): Promise<ChatMessage>;
  editMessage(conversationId: string, messageId: string, body: string): Promise<ChatMessage>;
  deleteMessage(conversationId: string, messageId: string): Promise<void>;
  /** Find or create a direct conversation with another user. */
  startDirect(userId: string): Promise<Conversation>;
}

// ---------------- HTTP adapter ----------------
const httpChatService: ChatService = {
  listConversations: () => api.get<Conversation[]>('/conversations'),
  getMessages: (id) => api.get<ChatMessage[]>(`/conversations/${id}/messages`),
  sendMessage: (id, body) => api.post<ChatMessage>(`/conversations/${id}/messages`, { body }),
  editMessage: (convId, msgId, body) => api.patch<ChatMessage>(`/conversations/${convId}/messages/${msgId}`, { body }),
  deleteMessage: (convId, msgId) => api.delete<void>(`/conversations/${convId}/messages/${msgId}`),
  startDirect: (userId) => api.post<Conversation>('/conversations', { type: 'direct', participantId: userId }),
};

// ---------------- Mock adapter ----------------
function toDto(c: StoredConversation, db: MockDb, userId: string): Conversation {
  const msgs = db.messages.filter((m) => m.conversationId === c.id);
  const last = msgs.at(-1) ?? null;
  const lastRead = c.lastReadAt[userId] ?? '';
  const participants = c.participantIds
    .map((id) => db.users.find((u) => u.id === id))
    .filter((u) => !!u)
    .map((u) => ({ id: u.id, fullName: u.fullName, position: u.position }));
  const other = participants.find((p) => p.id !== userId);
  return {
    id: c.id,
    type: c.type,
    title: c.type === 'branch' ? c.title : (other?.fullName ?? 'Conversation'),
    participants,
    lastMessage: last,
    unreadCount: msgs.filter((m) => m.senderId !== userId && m.sentAt > lastRead).length,
    updatedAt: last?.sentAt ?? '',
  };
}

function findMine(id: string, userId: string) {
  const c = getDb().conversations.find((x) => x.id === id && x.participantIds.includes(userId));
  if (!c) throw mockError(404, 'NOT_FOUND', 'Conversation not found.');
  return c;
}

const mockChatService: ChatService = {
  async listConversations() {
    await delay(200);
    const user = requireUser();
    const db = getDb();
    return db.conversations
      .filter((c) => c.participantIds.includes(user.id))
      .map((c) => toDto(c, db, user.id))
      .sort((a, b) => (a.type === 'branch' ? -1 : b.type === 'branch' ? 1 : b.updatedAt.localeCompare(a.updatedAt)));
  },
  async getMessages(id) {
    await delay(200);
    const user = requireUser();
    const c = findMine(id, user.id);
    c.lastReadAt[user.id] = nowISO();
    commit();
    return getDb().messages.filter((m) => m.conversationId === id);
  },
  async sendMessage(id, body) {
    await delay(150);
    const user = requireUser();
    findMine(id, user.id);
    const text = body.trim();
    if (!text) throw mockError(422, 'VALIDATION', 'Message cannot be empty.');
    if (text.length > 2000) throw mockError(422, 'VALIDATION', 'Message is too long (max 2000 characters).');
    const m: ChatMessage = { id: uid('m'), conversationId: id, senderId: user.id, senderName: user.fullName, body: text, sentAt: nowISO() };
    const db = getDb();
    db.messages.push(m);
    findMine(id, user.id).lastReadAt[user.id] = m.sentAt;
    commit();
    return m;
  },
  async editMessage(convId, msgId, body) {
    await delay(150);
    const user = requireUser();
    findMine(convId, user.id);
    const text = body.trim();
    if (!text) throw mockError(422, 'VALIDATION', 'Message cannot be empty.');
    if (text.length > 2000) throw mockError(422, 'VALIDATION', 'Message is too long (max 2000 characters).');
    const db = getDb();
    const msg = db.messages.find((m) => m.id === msgId && m.conversationId === convId);
    if (!msg) throw mockError(404, 'NOT_FOUND', 'Message not found.');
    if (msg.senderId !== user.id) throw mockError(403, 'FORBIDDEN', 'You can only edit your own messages.');
    msg.body = text;
    msg.editedAt = nowISO();
    commit();
    return msg;
  },
  async deleteMessage(convId, msgId) {
    await delay(150);
    const user = requireUser();
    findMine(convId, user.id);
    const db = getDb();
    const idx = db.messages.findIndex((m) => m.id === msgId && m.conversationId === convId);
    if (idx === -1) throw mockError(404, 'NOT_FOUND', 'Message not found.');
    const msg = db.messages[idx];
    if (msg.senderId !== user.id && user.role !== 'manager') {
      throw mockError(403, 'FORBIDDEN', 'You can only delete your own messages.');
    }
    db.messages.splice(idx, 1);
    commit();
  },
  async startDirect(userId) {
    await delay(200);
    const user = requireUser();
    const db = getDb();
    if (userId === user.id || !db.users.some((u) => u.id === userId && u.status === 'active')) {
      throw mockError(422, 'VALIDATION', 'Select an active colleague.');
    }
    let c = db.conversations.find(
      (x) => x.type === 'direct' && x.participantIds.length === 2 && x.participantIds.includes(user.id) && x.participantIds.includes(userId),
    );
    if (!c) {
      c = { id: uid('c'), type: 'direct', title: '', participantIds: [user.id, userId], lastReadAt: { [user.id]: nowISO() } };
      db.conversations.push(c);
      commit();
    }
    return toDto(c, db, user.id);
  },
};

export const chatService: ChatService = env.useMockApi ? mockChatService : httpChatService;
