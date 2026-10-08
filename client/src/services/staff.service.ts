import { env } from '@/config/env';
import type { AccountStatus, UpdateProfileRequest, User } from '@/types';
import { api } from './http/apiClient';
import { commit, getDb } from './mock/mockDb';
import { requireManager, requireUser, toPublicUser } from './mock/mockGuards';
import { delay, mockError, nowISO } from './mock/mockUtils';

export interface StaffListParams {
  status?: AccountStatus | 'all';
  search?: string;
}

export interface StaffService {
  list(params?: StaffListParams): Promise<User[]>;
  getById(id: string): Promise<User>;
  listPending(): Promise<User[]>;
  /** Approve a pending registration, optionally assigning KPIs in the same step (SRS §14.4). */
  approve(id: string, opts?: { kpiIds?: string[] }): Promise<User>;
  reject(id: string, reason: string): Promise<User>;
  setStatus(id: string, status: 'active' | 'deactivated'): Promise<User>;
  updateMyProfile(req: UpdateProfileRequest): Promise<User>;
  /** Active colleagues for chat/directory (both roles). */
  listDirectory(): Promise<User[]>;
}

// ---------------- HTTP adapter ----------------
const httpStaffService: StaffService = {
  list: (params) => api.get<User[]>('/staff', { status: params?.status === 'all' ? undefined : params?.status, search: params?.search }),
  getById: (id) => api.get<User>(`/staff/${id}`),
  listPending: () => api.get<User[]>('/staff/pending'),
  approve: (id, opts) => api.post<User>(`/staff/${id}/approve`, opts ?? {}),
  reject: (id, reason) => api.post<User>(`/staff/${id}/reject`, { reason }),
  setStatus: (id, status) => api.patch<User>(`/staff/${id}/status`, { status }),
  updateMyProfile: (req) => api.patch<User>('/staff/me', req),
  listDirectory: () => api.get<User[]>('/staff/directory'),
};

// ---------------- Mock adapter ----------------
function findStaff(id: string) {
  const user = getDb().users.find((u) => u.id === id && u.role === 'staff');
  if (!user) throw mockError(404, 'NOT_FOUND', 'Staff member not found.');
  return user;
}

const mockStaffService: StaffService = {
  async list(params = {}) {
    await delay();
    requireManager();
    const q = params.search?.trim().toLowerCase();
    return getDb()
      .users.filter((u) => u.role === 'staff' && u.status !== 'pending_email_verification')
      .filter((u) => !params.status || params.status === 'all' || u.status === params.status)
      .filter((u) => !q || [u.fullName, u.employeeId, u.position, u.email].some((f) => f.toLowerCase().includes(q)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(toPublicUser);
  },
  async getById(id) {
    await delay();
    requireManager();
    const user = findStaff(id);
    if (user.status === 'pending_email_verification') {
      throw mockError(404, 'NOT_FOUND', 'Staff member not found or email verification pending.');
    }
    return toPublicUser(user);
  },
  async listPending() {
    await delay();
    requireManager();
    return getDb()
      .users.filter((u) => u.role === 'staff' && u.status === 'pending_approval')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toPublicUser);
  },
  async approve(id, opts) {
    await delay(500);
    requireManager();
    const db = getDb();
    const user = findStaff(id);
    if (user.status !== 'pending_approval') {
      throw mockError(409, 'INVALID_STATE', 'Only verified pending registrations can be approved.');
    }
    user.status = 'active';
    user.approvedAt = nowISO();
    for (const kpiId of opts?.kpiIds ?? []) {
      if (!db.assignments.some((a) => a.kpiId === kpiId && a.staffId === id)) {
        db.assignments.push({ id: `as_${id}_${kpiId}`, kpiId, staffId: id, targetOverride: null, assignedAt: nowISO() });
      }
    }
    db.conversations.find((c) => c.type === 'branch')?.participantIds.push(id);
    commit();
    return toPublicUser(user);
  },
  async reject(id, reason) {
    await delay(500);
    requireManager();
    const user = findStaff(id);
    if (user.status !== 'pending_approval') {
      throw mockError(409, 'INVALID_STATE', 'Only verified pending registrations can be rejected.');
    }
    user.status = 'rejected';
    user.rejectionReason = reason;
    user.approvedAt = nowISO();
    commit();
    return toPublicUser(user);
  },
  async setStatus(id, status) {
    await delay(400);
    requireManager();
    const user = findStaff(id);
    if (user.status === 'pending_approval' || user.status === 'rejected' || user.status === 'pending_email_verification') {
      throw mockError(409, 'INVALID_STATE', 'Use approve/reject for registrations.');
    }
    user.status = status;
    commit();
    return toPublicUser(user);
  },
  async updateMyProfile(req) {
    await delay(400);
    const user = requireUser();
    if (req.email !== undefined) user.email = req.email.trim();
    if (req.phone !== undefined) user.phone = req.phone.trim();
    if (req.avatarUrl !== undefined) user.avatarUrl = req.avatarUrl;
    commit();
    return toPublicUser(user);
  },
  async listDirectory() {
    await delay(150);
    requireUser();
    return getDb()
      .users.filter((u) => u.status === 'active')
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(toPublicUser);
  },
};

export const staffService: StaffService = env.useMockApi ? mockStaffService : httpStaffService;
