import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { userRepository } from '../../repositories/user.repository.js';

const enrolledBranchUsers = new Set<string>();
let cachedBranchConvId: string | null = null;

interface CachedConversations {
  data: any;
  timestamp: number;
}
const convCache = new Map<string, CachedConversations>();
const CONV_CACHE_TTL = 15000;

export function invalidateConversationCache(userId?: string) {
  if (userId) {
    convCache.delete(userId);
  } else {
    convCache.clear();
  }
}

/**
 * Ensures the branch-wide channel exists and the active user is enrolled as a participant.
 */
async function ensureBranchConversationParticipant(userId: string) {
  if (enrolledBranchUsers.has(userId)) return null;

  let branchConvId = cachedBranchConvId;
  if (!branchConvId) {
    const existing = await prisma.conversation.findFirst({
      where: { type: 'branch' },
      select: { id: true },
    });
    if (existing) {
      cachedBranchConvId = existing.id;
      branchConvId = existing.id;
    } else {
      const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
      const branchTitle = settings?.branchName ? `${settings.branchName} Channel` : 'Branch Channel';
      const created = await prisma.conversation.create({
        data: {
          type: 'branch',
          title: branchTitle,
          participants: {
            create: [{ userId }],
          },
        },
        select: { id: true },
      });
      cachedBranchConvId = created.id;
      enrolledBranchUsers.add(userId);
      return created;
    }
  }

  // Ensure user is participant
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: branchConvId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!isParticipant) {
    await prisma.conversationParticipant.create({
      data: {
        conversationId: branchConvId,
        userId,
      },
    });
  }

  enrolledBranchUsers.add(userId);
  return null;
}

export async function listConversations(userId: string) {
  const cached = convCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CONV_CACHE_TTL) {
    return cached.data;
  }

  // Guarantee active user is in the branch channel
  await ensureBranchConversationParticipant(userId);

  // Find all conversations where userId is a participant
  const convs = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, positionTitle: true, role: true },
          },
        },
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { fullName: true, role: true, positionTitle: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = await Promise.all(
    convs.map(async (c: any) => {
      const myParticipant = c.participants.find((p: any) => p.userId === userId);
      const lastReadAt = myParticipant?.lastReadAt;
      const lastMsg = c.messages[0];

      let unreadCount = 0;
      if (lastMsg) {
        // If last message was sent by myself, unread is 0
        if (lastMsg.senderId === userId) {
          unreadCount = 0;
        } else if (lastReadAt && new Date(lastReadAt).getTime() >= new Date(lastMsg.sentAt).getTime()) {
          // If I've read at or after the last message was sent, unread is 0
          unreadCount = 0;
        } else {
          // Count unread messages since lastReadAt
          unreadCount = await prisma.chatMessage.count({
            where: {
              conversationId: c.id,
              senderId: { not: userId },
              ...(lastReadAt ? { sentAt: { gt: lastReadAt } } : {}),
            },
          });
        }
      }

      const participants = c.participants
        .filter((p: any) => p.user)
        .map((p: any) => ({
          id: p.user.id,
          fullName: p.user.fullName,
          position: p.user.positionTitle || (p.user.role === 'manager' ? 'Branch Manager' : 'Staff'),
          role: p.user.role,
        }));

      const other = participants.find((p: any) => p.id !== userId);
      const title = c.type === 'branch' ? c.title : other?.fullName ?? 'Conversation';

      const formattedLastMsg = lastMsg
        ? {
            id: lastMsg.id,
            conversationId: lastMsg.conversationId,
            senderId: lastMsg.senderId,
            senderName: lastMsg.sender.fullName,
            senderRole: lastMsg.sender.role,
            senderPosition: lastMsg.sender.role === 'manager' ? 'Branch Manager' : (lastMsg.sender.positionTitle || 'Staff'),
            body: lastMsg.body,
            sentAt: lastMsg.sentAt.toISOString(),
            isEdited: lastMsg.isEdited,
          }
        : null;

      return {
        id: c.id,
        type: c.type,
        title,
        participants,
        lastMessage: formattedLastMsg,
        unreadCount,
        updatedAt: c.updatedAt.toISOString(),
      };
    }),
  );

  convCache.set(userId, { data: result, timestamp: Date.now() });
  return result;
}

export async function getMessages(conversationId: string, userId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conv) {
    throw ApiError.notFound('Conversation not found.');
  }

  // Auto-join if branch conversation
  let isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!isParticipant && conv.type === 'branch') {
    isParticipant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
      },
    });
  }

  if (!isParticipant) {
    throw ApiError.forbidden('You are not a member of this conversation.');
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    include: {
      sender: { select: { fullName: true, role: true, positionTitle: true } },
    },
    orderBy: { sentAt: 'asc' },
  });

  // Mark conversation as read for this user
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    data: { lastReadAt: new Date() },
  });

  // Invalidate nav counts for this user since unread messages are cleared
  realtimeService.notifyCountInvalidated([userId]);
  invalidateConversationCache(userId);

  return messages.map((m: any) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.sender.fullName,
    senderRole: m.sender.role,
    senderPosition: m.sender.role === 'manager' ? 'Branch Manager' : (m.sender.positionTitle || 'Staff'),
    body: m.body,
    sentAt: m.sentAt.toISOString(),
    isEdited: m.isEdited,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });

  if (!conv) {
    throw ApiError.notFound('Conversation not found.');
  }

  let isParticipant = conv.participants.some((p: any) => p.userId === senderId);
  if (!isParticipant && conv.type === 'branch') {
    await prisma.conversationParticipant.create({
      data: { conversationId, userId: senderId },
    });
    isParticipant = true;
  }

  if (!isParticipant) {
    throw ApiError.forbidden('You are not a member of this conversation.');
  }

  const now = new Date();

  const msg = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId,
      body: body.trim(),
      sentAt: now,
    },
    include: {
      sender: { select: { fullName: true, role: true, positionTitle: true } },
    },
  });

  const formattedMsg = {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderName: msg.sender.fullName,
    senderRole: msg.sender.role,
    senderPosition: msg.sender.role === 'manager' ? 'Branch Manager' : (msg.sender.positionTitle || 'Staff'),
    body: msg.body,
    sentAt: msg.sentAt.toISOString(),
    isEdited: msg.isEdited,
  };

  // Reuse pre-fetched participants list to avoid extra database round-trip
  const participantIds: string[] = conv.participants.map((p: any) => p.userId);
  if (!participantIds.includes(senderId)) {
    participantIds.push(senderId);
  }

  // Real-time broadcast and cache invalidation immediately
  realtimeService.broadcastToConversation(participantIds, 'chat_message', formattedMsg);
  realtimeService.notifyCountInvalidated(participantIds);
  participantIds.forEach((id: string) => invalidateConversationCache(id));

  // Non-blocking metadata updates in background (does not delay client response)
  Promise.all([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: now },
    }),
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
      data: { lastReadAt: now },
    }),
  ]).catch(() => {});

  return formattedMsg;
}

export async function editMessage(conversationId: string, messageId: string, userId: string, body: string) {
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!msg) {
    throw ApiError.notFound('Message not found.');
  }

  if (msg.senderId !== userId) {
    throw ApiError.forbidden('You can only edit your own messages.');
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      body: body.trim(),
      isEdited: true,
    },
    include: {
      sender: { select: { fullName: true, role: true, positionTitle: true } },
    },
  });

  const formattedMsg = {
    id: updated.id,
    conversationId: updated.conversationId,
    senderId: updated.senderId,
    senderName: updated.sender.fullName,
    senderRole: updated.sender.role,
    senderPosition: updated.sender.role === 'manager' ? 'Branch Manager' : (updated.sender.positionTitle || 'Staff'),
    body: updated.body,
    sentAt: updated.sentAt.toISOString(),
    isEdited: updated.isEdited,
  };

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const participantIds = participants.map((p: any) => p.userId);
  realtimeService.broadcastToConversation(
    participantIds,
    'chat_message_updated',
    formattedMsg,
  );
  participantIds.forEach((id: string) => invalidateConversationCache(id));

  return formattedMsg;
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string, role: string) {
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!msg) {
    throw ApiError.notFound('Message not found.');
  }

  if (msg.senderId !== userId && role !== 'manager') {
    throw ApiError.forbidden('You do not have permission to delete this message.');
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const participantIds = participants.map((p: any) => p.userId);
  realtimeService.broadcastToConversation(
    participantIds,
    'chat_message_deleted',
    { conversationId, messageId },
  );
  realtimeService.notifyCountInvalidated(participantIds);
  participantIds.forEach((id: string) => invalidateConversationCache(id));
}

export async function startDirectConversation(userId: string, participantId: string) {
  if (userId === participantId) {
    throw ApiError.badRequest('Cannot start a direct conversation with yourself.');
  }

  const recipient = await prisma.user.findUnique({ where: { id: participantId } });
  if (!recipient) {
    throw ApiError.notFound('Target user not found.');
  }

  invalidateConversationCache(userId);
  invalidateConversationCache(participantId);

  // Find if direct conversation already exists between both users
  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'direct',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: participantId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, fullName: true, positionTitle: true, role: true } },
        },
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: { sender: { select: { fullName: true, role: true, positionTitle: true } } },
      },
    },
  });

  if (existing) {
    const participants = existing.participants
      .filter((p: any) => p.user)
      .map((p: any) => ({
        id: p.user.id,
        fullName: p.user.fullName,
        position: p.user.positionTitle || (p.user.role === 'manager' ? 'Branch Manager' : 'Staff'),
        role: p.user.role,
      }));
    const other = participants.find((p: any) => p.id !== userId);

    return {
      id: existing.id,
      type: existing.type,
      title: other?.fullName ?? 'Conversation',
      participants,
      lastMessage: existing.messages[0]
        ? {
            id: existing.messages[0].id,
            conversationId: existing.messages[0].conversationId,
            senderId: existing.messages[0].senderId,
            senderName: existing.messages[0].sender.fullName,
            senderRole: existing.messages[0].sender.role,
            senderPosition: existing.messages[0].sender.role === 'manager' ? 'Branch Manager' : (existing.messages[0].sender.positionTitle || 'Staff'),
            body: existing.messages[0].body,
            sentAt: existing.messages[0].sentAt.toISOString(),
            isEdited: existing.messages[0].isEdited,
          }
        : null,
      unreadCount: 0,
      updatedAt: existing.updatedAt.toISOString(),
    };
  }

  // Create new direct conversation with both participants
  const created = await prisma.conversation.create({
    data: {
      type: 'direct',
      title: `${recipient.fullName}`,
      participants: {
        create: [
          { userId },
          { userId: participantId },
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, fullName: true, positionTitle: true, role: true } },
        },
      },
    },
  });

  const participants = created.participants
    .filter((p: any) => p.user)
    .map((p: any) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      position: p.user.positionTitle || (p.user.role === 'manager' ? 'Branch Manager' : 'Staff'),
      role: p.user.role,
    }));

  return {
    id: created.id,
    type: created.type,
    title: recipient.fullName,
    participants,
    lastMessage: null,
    unreadCount: 0,
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function getContacts(currentUserId: string) {
  if (env.DATABASE_URL) {
    try {
      const users = await prisma.user.findMany({
        where: {
          status: 'active',
          id: { not: currentUserId },
        },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          role: true,
          positionTitle: true,
          avatarUrl: true,
        },
        orderBy: [
          { role: 'asc' }, // 'manager' comes before 'staff'
          { fullName: 'asc' },
        ],
      });

      return users.map((u: any) => ({
        id: u.id,
        employeeId: u.employeeId,
        fullName: u.fullName,
        role: u.role,
        position: u.role === 'manager' ? 'Branch Manager' : (u.positionTitle || 'Staff'),
        avatarUrl: u.avatarUrl,
      }));
    } catch {
      // Fallback on connection drop
    }
  }

  const allStaff = await userRepository.listStaff({ status: 'active' });
  const manager = await userRepository.findManager();
  const contacts: any[] = [];
  if (manager && manager.id !== currentUserId) {
    contacts.push({
      id: manager.id,
      employeeId: manager.employeeId,
      fullName: manager.fullName,
      role: 'manager',
      position: 'Branch Manager',
      avatarUrl: manager.avatarUrl,
    });
  }
  for (const s of allStaff) {
    if (s.id !== currentUserId) {
      contacts.push({
        id: s.id,
        employeeId: s.employeeId,
        fullName: s.fullName,
        role: s.role,
        position: s.position,
        avatarUrl: s.avatarUrl,
      });
    }
  }
  return contacts;
}
