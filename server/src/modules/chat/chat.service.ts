import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';

export async function listConversations(userId: string) {
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
            select: { id: true, fullName: true, positionTitle: true },
          },
        },
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { fullName: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = [];
  for (const c of convs) {
    const myParticipant = c.participants.find((p: any) => p.userId === userId);
    const lastReadAt = myParticipant?.lastReadAt;

    const unreadCount = await prisma.chatMessage.count({
      where: {
        conversationId: c.id,
        senderId: { not: userId },
        ...(lastReadAt ? { sentAt: { gt: lastReadAt } } : {}),
      },
    });

    const participants = c.participants
      .filter((p: any) => p.user)
      .map((p: any) => ({
        id: p.user.id,
        fullName: p.user.fullName,
        position: p.user.positionTitle,
      }));

    const other = participants.find((p: any) => p.id !== userId);
    const title = c.type === 'branch' ? c.title : other?.fullName ?? 'Conversation';

    const lastMsg = c.messages[0];
    const formattedLastMsg = lastMsg
      ? {
          id: lastMsg.id,
          conversationId: lastMsg.conversationId,
          senderId: lastMsg.senderId,
          senderName: lastMsg.sender.fullName,
          body: lastMsg.body,
          sentAt: lastMsg.sentAt.toISOString(),
          isEdited: lastMsg.isEdited,
        }
      : null;

    result.push({
      id: c.id,
      type: c.type,
      title,
      participants,
      lastMessage: formattedLastMsg,
      unreadCount,
      updatedAt: c.updatedAt.toISOString(),
    });
  }

  return result;
}

export async function getMessages(conversationId: string, userId: string) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!isParticipant) {
    throw ApiError.forbidden('You are not a member of this conversation.');
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    include: {
      sender: { select: { fullName: true } },
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

  return messages.map((m: any) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.sender.fullName,
    body: m.body,
    sentAt: m.sentAt.toISOString(),
    isEdited: m.isEdited,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: senderId,
      },
    },
  });

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
      sender: { select: { fullName: true } },
    },
  });

  // Update conversation updatedAt & sender's lastReadAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: now },
  });

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId: senderId,
      },
    },
    data: { lastReadAt: now },
  });

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderName: msg.sender.fullName,
    body: msg.body,
    sentAt: msg.sentAt.toISOString(),
    isEdited: msg.isEdited,
  };
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
      sender: { select: { fullName: true } },
    },
  });

  return {
    id: updated.id,
    conversationId: updated.conversationId,
    senderId: updated.senderId,
    senderName: updated.sender.fullName,
    body: updated.body,
    sentAt: updated.sentAt.toISOString(),
    isEdited: updated.isEdited,
  };
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
}

export async function startDirectConversation(userId: string, participantId: string) {
  if (userId === participantId) {
    throw ApiError.badRequest('Cannot start a direct conversation with yourself.');
  }

  const recipient = await prisma.user.findUnique({ where: { id: participantId } });
  if (!recipient) {
    throw ApiError.notFound('Target user not found.');
  }

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
          user: { select: { id: true, fullName: true, positionTitle: true } },
        },
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: { sender: { select: { fullName: true } } },
      },
    },
  });

  if (existing) {
    const participants = existing.participants
      .filter((p: any) => p.user)
      .map((p: any) => ({
        id: p.user.id,
        fullName: p.user.fullName,
        position: p.user.positionTitle,
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
          user: { select: { id: true, fullName: true, positionTitle: true } },
        },
      },
    },
  });

  const participants = created.participants
    .filter((p: any) => p.user)
    .map((p: any) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      position: p.user.positionTitle,
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
