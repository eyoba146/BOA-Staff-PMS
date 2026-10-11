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
  /** Approve a pending registration, assigning the official Employee ID and optionally KPIs (SRS §14.4). */
  approve(id: string, opts?: { employeeId?: string; kpiIds?: string[] }): Promise<User>;
  reject(id: string, reason: string): Promise<User>;
  setStatus(id: string, status: 'active' | 'deactivated'): Promise<User>;
  updateMyProfile(req: UpdateProfileRequest): Promise<User>;
  /** Active colleagues for chat/directory (both roles). */
  listDirectory(): Promise<User[]>;
  /** Get next sequential staff Employee ID from server. */
  getNextEmployeeId(): Promise<{ employeeId: string }>;
  /** Request 6-digit verification code to update staff email. */
  requestEmailChange(newEmail: string): Promise<{ success: boolean; message: string; expiresAt: string; resendAfter: string; serverTime: string }>;
  /** Verify 6-digit code and finalize staff email update. */
  verifyEmailChange(newEmail: string, code: string): Promise<User>;
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
  getNextEmployeeId: () => api.get<{ employeeId: string }>('/staff/next-employee-id'),
  requestEmailChange: (newEmail) => api.post('/staff/email/request', { newEmail }),
  verifyEmailChange: (newEmail, code) => api.post<User>('/staff/email/verify', { newEmail, code }),
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
    if (!user.emailVerified) {
      throw mockError(400, 'EMAIL_NOT_VERIFIED', 'Candidate must complete email verification before manager approval.');
    }

    const assignedEmpId = opts?.employeeId?.trim() || user.employeeId?.trim();
    if (!assignedEmpId) {
      throw mockError(400, 'EMPLOYEE_ID_REQUIRED', 'Official Employee ID must be assigned by management prior to approval.');
    }

    // Check Employee ID uniqueness among other registered users
    const duplicate = db.users.find(
      (u) => u.id !== id && u.employeeId && u.employeeId.toLowerCase() === assignedEmpId.toLowerCase()
    );
    if (duplicate) {
      throw mockError(409, 'DUPLICATE_EMPLOYEE_ID', `Employee ID "${assignedEmpId}" is already assigned to ${duplicate.fullName}.`);
    }

    // Check that the selected position is an approved branch position
    if (db.positions && db.positions.length > 0) {
      const positionExists = db.positions.some(
        (p) => p.name.toLowerCase() === user.position.toLowerCase()
      );
      if (!positionExists) {
        throw mockError(400, 'INVALID_POSITION', `The position "${user.position}" is not an approved branch position.`);
      }
    }

    user.employeeId = assignedEmpId;
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
  async getNextEmployeeId() {
    await delay(100);
    const users = getDb().users;
    let maxNum = 0;
    for (const u of users) {
      if (u.employeeId) {
        const match = u.employeeId.match(/^BOA-S(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
    return { employeeId: `BOA-S${String(maxNum + 1).padStart(3, '0')}` };
  },
  async requestEmailChange(newEmail: string) {
    await delay(200);
    return {
      success: true,
      message: `Verification code sent to ${newEmail}`,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      resendAfter: new Date(Date.now() + 60000).toISOString(),
      serverTime: new Date().toISOString(),
    };
  },
  async verifyEmailChange(newEmail: string) {
    await delay(300);
    const user = requireUser();
    user.email = newEmail.trim();
    commit();
    return toPublicUser(user);
  },
};

export const staffService: StaffService = env.useMockApi ? mockStaffService : httpStaffService;
