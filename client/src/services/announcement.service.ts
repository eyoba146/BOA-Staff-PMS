import { env } from '@/config/env';
import type { Announcement, AnnouncementInput, AnnouncementStatus } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';
import type { StoredAnnouncement } from './mock/seed';

export interface AnnouncementService {
  /** Staff: published only. Manager: any status. */
  list(filter?: { status?: AnnouncementStatus }): Promise<Announcement[]>;
  create(input: AnnouncementInput): Promise<Announcement>;
  update(id: string, input: AnnouncementInput): Promise<Announcement>;
  archive(id: string): Promise<Announcement>;
  markRead(id: string): Promise<void>;
}

// ---------------- HTTP adapter ----------------
const httpAnnouncementService: AnnouncementService = {
  list: (filter) => api.get<Announcement[]>('/announcements', { status: filter?.status }),
  create: (input) => api.post<Announcement>('/announcements', input),
  update: (id, input) => api.patch<Announcement>(`/announcements/${id}`, input),
  archive: (id) => api.post<Announcement>(`/announcements/${id}/archive`),
  markRead: (id) => api.post<void>(`/announcements/${id}/read`),
};

// ---------------- Mock adapter ----------------
function toDto(a: StoredAnnouncement, userId: string): Announcement {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { readBy, ...rest } = a;
  return { ...rest, isRead: readBy.includes(userId) };
}

function find(id: string) {
  const a = getDb().announcements.find((x) => x.id === id);
  if (!a) throw mockError(404, 'NOT_FOUND', 'Announcement not found.');
  return a;
}

const mockAnnouncementService: AnnouncementService = {
  async list(filter = {}) {
    await delay();
    const user = requireUser();
    const status = user.role === 'manager' ? filter.status : 'published';
    return getDb()
      .announcements.filter((a) => !status || a.status === status)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
      .map((a) => toDto(a, user.id));
  },
  async create(input) {
    await delay(450);
    const manager = requireManager();
    const now = nowISO();
    const a: StoredAnnouncement = {
      id: uid('a'),
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      pinned: input.pinned,
      status: input.publish ? 'published' : 'draft',
      authorName: manager.fullName,
      createdAt: now,
      publishedAt: input.publish ? now : null,
      readBy: [manager.id],
    };
    getDb().announcements.push(a);
    commit();
    return toDto(a, manager.id);
  },
  async update(id, input) {
    await delay(450);
    const manager = requireManager();
    const a = find(id);
    Object.assign(a, { title: input.title.trim(), body: input.body.trim(), category: input.category, pinned: input.pinned });
    if (input.publish && a.status !== 'published') {
      a.status = 'published';
      a.publishedAt = nowISO();
    }
    commit();
    return toDto(a, manager.id);
  },
  async archive(id) {
    await delay(300);
    const manager = requireManager();
    const a = find(id);
    a.status = 'archived';
    a.pinned = false;
    commit();
    return toDto(a, manager.id);
  },
  async markRead(id) {
    await delay(80);
    const user = requireUser();
    const a = find(id);
    if (!a.readBy.includes(user.id)) {
      a.readBy.push(user.id);
      commit();
    }
  },
};

export const announcementService: AnnouncementService = env.useMockApi ? mockAnnouncementService : httpAnnouncementService;
