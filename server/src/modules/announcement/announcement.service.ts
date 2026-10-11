import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { realtimeService } from '../realtime/realtime.service.js';

interface CachedAnnouncements {
  data: any;
  timestamp: number;
}
const announcementCache = new Map<string, CachedAnnouncements>();
const ANNOUNCEMENT_CACHE_TTL = 30000;

export function invalidateAnnouncementCache(userId?: string) {
  if (userId) {
    for (const key of announcementCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        announcementCache.delete(key);
      }
    }
  } else {
    announcementCache.clear();
  }
}

export async function listAnnouncements(userId: string, role: string, statusFilter?: string) {
  const cacheKey = `${userId}_${role}_${statusFilter ?? 'all'}`;
  const cached = announcementCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ANNOUNCEMENT_CACHE_TTL) {
    return cached.data;
  }

  const where: any = {};
  if (role === 'manager') {
    if (statusFilter) {
      where.status = statusFilter;
    }
  } else {
    // Staff can only view published announcements
    where.status = 'published';
  }

  const list = await prisma.announcement.findMany({
    where,
    include: {
      author: { select: { fullName: true } },
      reads: { where: { userId } },
    },
    orderBy: [
      { pinned: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  const result = list.map((a: any) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    category: a.category,
    pinned: a.pinned,
    status: a.status,
    authorId: a.authorId,
    authorName: a.author.fullName,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    isRead: a.reads.length > 0,
  }));

  announcementCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function createAnnouncement(authorId: string, input: any) {
  const isPublish = Boolean(input.publish);
  const now = new Date();

  const created = await prisma.announcement.create({
    data: {
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      pinned: Boolean(input.pinned),
      status: isPublish ? 'published' : 'draft',
      authorId,
      publishedAt: isPublish ? now : null,
    },
    include: {
      author: { select: { fullName: true } },
    },
  });

  await recordAuditLog({
    action: 'CREATE_ANNOUNCEMENT',
    actorId: authorId,
    details: `Created announcement "${created.title}" (status: ${created.status})`,
  });

  const dto = {
    id: created.id,
    title: created.title,
    body: created.body,
    category: created.category,
    pinned: created.pinned,
    status: created.status,
    authorId: created.authorId,
    authorName: created.author.fullName,
    publishedAt: created.publishedAt ? created.publishedAt.toISOString() : null,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    isRead: true, // author automatically viewed
  };

  if (isPublish) {
    realtimeService.broadcastToBranch('announcement_created', dto);
    realtimeService.notifyCountInvalidated();
  }
  invalidateAnnouncementCache();

  return dto;
}

export async function updateAnnouncement(id: string, authorId: string, input: any) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Announcement not found.');
  }

  const isPublish = input.publish !== undefined ? Boolean(input.publish) : existing.status === 'published';
  const now = new Date();

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.body ? { body: input.body.trim() } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.pinned !== undefined ? { pinned: Boolean(input.pinned) } : {}),
      status: isPublish ? 'published' : 'draft',
      publishedAt: isPublish ? existing.publishedAt ?? now : null,
    },
    include: {
      author: { select: { fullName: true } },
    },
  });

  await recordAuditLog({
    action: 'UPDATE_ANNOUNCEMENT',
    actorId: authorId,
    details: `Updated announcement "${updated.title}"`,
  });

  invalidateAnnouncementCache();

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    category: updated.category,
    pinned: updated.pinned,
    status: updated.status,
    authorId: updated.authorId,
    authorName: updated.author.fullName,
    publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    isRead: true,
  };
}

export async function archiveAnnouncement(id: string, authorId: string) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Announcement not found.');
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: { status: 'archived' },
    include: {
      author: { select: { fullName: true } },
    },
  });

  await recordAuditLog({
    action: 'ARCHIVE_ANNOUNCEMENT',
    actorId: authorId,
    details: `Archived announcement "${updated.title}"`,
  });

  invalidateAnnouncementCache();

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    category: updated.category,
    pinned: updated.pinned,
    status: updated.status,
    authorId: updated.authorId,
    authorName: updated.author.fullName,
    publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    isRead: true,
  };
}

export async function markAnnouncementRead(announcementId: string, userId: string) {
  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId,
      },
    },
    update: { readAt: new Date() },
    create: {
      announcementId,
      userId,
    },
  });

  realtimeService.notifyCountInvalidated([userId]);
  invalidateAnnouncementCache(userId);
}
