import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';

export async function listUserNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return {
    items: items.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link,
      read: n.read,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    throw ApiError.notFound('Notification not found.');
  }
  if (notification.userId !== userId) {
    throw ApiError.forbidden('Cannot mark another user notification as read.');
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true, readAt: new Date() },
  });

  return {
    id: updated.id,
    read: updated.read,
    readAt: updated.readAt?.toISOString() ?? null,
  };
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });

  return { success: true };
}
