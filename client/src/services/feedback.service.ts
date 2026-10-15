import { env } from '@/config/env';
import type { Feedback, FeedbackInput } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';

export interface FeedbackService {
  /** Feedback received by the signed-in staff member. */
  listMine(): Promise<Feedback[]>;
  /** Manager: all feedback, optionally filtered by staff or type. */
  list(filter?: { staffId?: string; type?: string }): Promise<Feedback[]>;
  create(input: FeedbackInput): Promise<any>;
  markRead(id: string): Promise<Feedback>;
  retryEmail(id: string): Promise<Feedback>;
}

// ---------------- HTTP adapter ----------------
const httpFeedbackService: FeedbackService = {
  listMine: () => api.get<Feedback[]>('/feedback/me'),
  list: (filter) => api.get<Feedback[]>('/feedback', { staffId: filter?.staffId, type: filter?.type }),
  create: (input) => api.post<any>('/feedback', input),
  markRead: (id) => api.patch<Feedback>(`/feedback/${id}/read`),
  retryEmail: (id) => api.post<Feedback>(`/feedback/${id}/retry-email`),
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
      .feedback.filter((f) => {
        if (filter.staffId && filter.staffId !== 'all' && f.staffId !== filter.staffId) return false;
        if (filter.type && filter.type !== 'all' && f.type !== filter.type) return false;
        return true;
      })
      .sort(byNewest);
  },
  async create(input) {
    await delay(500);
    const manager = requireManager();
    const db = getDb();

    const isAll = input.staffId === 'all';
    const targetStaff = isAll
      ? db.users.filter((u) => u.role === 'staff' && u.status === 'active')
      : db.users.filter((u) => u.id === input.staffId && u.role === 'staff' && u.status === 'active');

    if (targetStaff.length === 0) {
      throw mockError(422, 'VALIDATION', 'No active staff member selected.', { staffId: 'Select an active staff member.' });
    }

    const kpi = input.kpiId ? db.kpis.find((k) => k.id === input.kpiId) : null;
    const createdItems: Feedback[] = [];

    for (const staff of targetStaff) {
      const item: Feedback = {
        id: uid('f'),
        staffId: staff.id,
        staffName: staff.fullName,
        employeeId: staff.employeeId ?? null,
        position: staff.position ?? null,
        recipientEmail: staff.email,
        managerId: manager.id,
        managerName: manager.fullName,
        type: input.type || 'feedback',
        audience: input.audience || 'recipient_only',
        subject: input.subject.trim(),
        message: input.message.trim(),
        period: input.period ?? null,
        periodLabel: input.periodLabel ?? null,
        kpiId: kpi?.id ?? null,
        kpiName: kpi?.name ?? null,
        emailStatus: 'sent',
        emailDeliveredAt: nowISO(),
        createdAt: nowISO(),
        readAt: null,
      };
      db.feedback.push(item);
      createdItems.push(item);
    }

    commit();
    return {
      success: true,
      count: createdItems.length,
      items: createdItems,
      feedback: createdItems[0],
    };
  },
  async retryEmail(id) {
    await delay(300);
    requireManager();
    const item = getDb().feedback.find((f) => f.id === id);
    if (!item) throw mockError(404, 'NOT_FOUND', 'Feedback not found.');
    item.emailStatus = 'sent';
    item.emailDeliveredAt = nowISO();
    item.emailError = null;
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
