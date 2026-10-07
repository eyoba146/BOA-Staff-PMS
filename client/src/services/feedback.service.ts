import { env } from '@/config/env';
import type { Feedback, FeedbackInput } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';

export interface FeedbackService {
  /** Feedback received by the signed-in staff member. */
  listMine(): Promise<Feedback[]>;
  /** Manager: all feedback, optionally for one staff member. */
  list(filter?: { staffId?: string }): Promise<Feedback[]>;
  create(input: FeedbackInput): Promise<Feedback>;
  markRead(id: string): Promise<Feedback>;
}

// ---------------- HTTP adapter ----------------
const httpFeedbackService: FeedbackService = {
  listMine: () => api.get<Feedback[]>('/feedback/me'),
  list: (filter) => api.get<Feedback[]>('/feedback', { staffId: filter?.staffId }),
  create: (input) => api.post<Feedback>('/feedback', input),
  markRead: (id) => api.patch<Feedback>(`/feedback/${id}/read`),
};

// ---------------- Mock adapter ----------------
const byNewest = (a: Feedback, b: Feedback) => b.createdAt.localeCompare(a.createdAt);

const mockFeedbackService: FeedbackService = {
  async listMine() {
    await delay();
    const user = requireUser();
    return getDb().feedback.filter((f) => f.staffId === user.id).sort(byNewest);
  },
  async list(filter = {}) {
    await delay();
    requireManager();
    return getDb()
      .feedback.filter((f) => !filter.staffId || f.staffId === filter.staffId)
      .sort(byNewest);
  },
  async create(input) {
    await delay(500);
    const manager = requireManager();
    const db = getDb();
    const staff = db.users.find((u) => u.id === input.staffId && u.role === 'staff' && u.status === 'active');
    if (!staff) throw mockError(422, 'VALIDATION', 'Select an active staff member.', { staffId: 'Select an active staff member.' });
    const kpi = input.kpiId ? db.kpis.find((k) => k.id === input.kpiId) : null;
    const item: Feedback = {
      id: uid('f'),
      staffId: staff.id,
      staffName: staff.fullName,
      managerId: manager.id,
      managerName: manager.fullName,
      subject: input.subject.trim(),
      message: input.message.trim(),
      period: input.period ?? null,
      periodLabel: input.periodLabel ?? null,
      kpiId: kpi?.id ?? null,
      kpiName: kpi?.name ?? null,
      createdAt: nowISO(),
      readAt: null,
    };
    db.feedback.push(item);
    commit();
    return item;
  },
  async markRead(id) {
    await delay(100);
    const user = requireUser();
    const item = getDb().feedback.find((f) => f.id === id && f.staffId === user.id);
    if (!item) throw mockError(404, 'NOT_FOUND', 'Feedback not found.');
    item.readAt ??= nowISO();
    commit();
    return item;
  },
};

export const feedbackService: FeedbackService = env.useMockApi ? mockFeedbackService : httpFeedbackService;
