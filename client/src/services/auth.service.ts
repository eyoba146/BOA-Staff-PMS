import { env } from '@/config/env';
import type {
  AccountStatusResult,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '@/types';
import { api, tokenStore } from './http/apiClient';
import { commit, getDb, mockSession } from './mock/mockDb';
import { requireUser, toPublicUser } from './mock/mockGuards';
import { delay, mockError, nowISO, uid } from './mock/mockUtils';

export interface AuthService {
  login(req: LoginRequest): Promise<User>;
  logout(): Promise<void>;
  /** Restore the session on app load. Resolves `null` when not signed in. */
  getCurrentUser(): Promise<User | null>;
  register(req: RegisterRequest): Promise<RegisterResponse>;
  getAccountStatus(employeeId: string): Promise<AccountStatusResult>;
  requestPasswordReset(identifier: string): Promise<void>;
  changePassword(req: ChangePasswordRequest): Promise<void>;
}

// ---------------- HTTP adapter (Express) ----------------
const httpAuthService: AuthService = {
  async login(req) {
    const res = await api.post<LoginResponse>('/auth/login', req);
    tokenStore.set(res.accessToken);
    return res.user;
  },
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenStore.clear();
    }
  },
  async getCurrentUser() {
    try {
      if (!tokenStore.get()) {
        const refreshed = await api.post<{ accessToken: string }>('/auth/refresh');
        tokenStore.set(refreshed.accessToken);
      }
      return await api.get<User>('/auth/me');
    } catch {
      tokenStore.clear();
      return null;
    }
  },
  register: (req) => api.post<RegisterResponse>('/auth/register', req),
  getAccountStatus: (employeeId) => api.get<AccountStatusResult>('/auth/registration-status', { employeeId }),
  requestPasswordReset: (identifier) => api.post<void>('/auth/forgot-password', { identifier }),
  changePassword: (req) => api.post<void>('/auth/change-password', req),
};

// ---------------- Mock adapter ----------------
const ACCOUNT_ERRORS = {
  pending_approval: ['ACCOUNT_PENDING', 'Your account is awaiting manager approval.'],
  rejected: ['ACCOUNT_REJECTED', 'Your registration was not approved. Check your account status for details.'],
  deactivated: ['ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact the branch manager.'],
} as const;

const mockAuthService: AuthService = {
  async login({ identifier, password, remember }) {
    await delay(500);
    const id = identifier.trim().toLowerCase();
    const user = getDb().users.find((u) => u.employeeId.toLowerCase() === id || u.email.toLowerCase() === id);
    if (!user || user.password !== password) {
      throw mockError(401, 'INVALID_CREDENTIALS', 'The employee ID or password is incorrect.');
    }
    if (user.status !== 'active') {
      const [code, message] = ACCOUNT_ERRORS[user.status];
      throw mockError(403, code, message);
    }
    mockSession.set(user.id, remember);
    return toPublicUser(user);
  },
  async logout() {
    await delay(150);
    mockSession.clear();
  },
  async getCurrentUser() {
    await delay(120);
    try {
      return toPublicUser(requireUser());
    } catch {
      mockSession.clear();
      return null;
    }
  },
  async register(req) {
    await delay(600);
    const db = getDb();
    const fieldErrors: Record<string, string> = {};
    if (db.users.some((u) => u.employeeId.toLowerCase() === req.employeeId.trim().toLowerCase())) {
      fieldErrors.employeeId = 'An account with this employee ID already exists.';
    }
    if (db.users.some((u) => u.email.toLowerCase() === req.email.trim().toLowerCase())) {
      fieldErrors.email = 'This email address is already registered.';
    }
    if (Object.keys(fieldErrors).length) throw mockError(409, 'CONFLICT', 'Please correct the highlighted fields.', fieldErrors);
    const referenceId = `REG-${req.employeeId.trim().toUpperCase()}`;
    db.users.push({
      id: uid('u'),
      employeeId: req.employeeId.trim().toUpperCase(),
      fullName: req.fullName.trim(),
      email: req.email.trim(),
      phone: req.phone.trim(),
      position: req.position.trim(),
      branchName: db.settings.branchName,
      role: 'staff',
      status: 'pending_approval',
      createdAt: nowISO(),
      approvedAt: null,
      rejectionReason: null,
      password: req.password,
      referenceId,
    });
    commit();
    return { referenceId, status: 'pending_approval' };
  },
  async getAccountStatus(employeeId) {
    await delay(400);
    const user = getDb().users.find((u) => u.employeeId.toLowerCase() === employeeId.trim().toLowerCase() && u.role === 'staff');
    if (!user) throw mockError(404, 'NOT_FOUND', 'No registration was found for this employee ID.');
    return {
      employeeId: user.employeeId,
      fullName: user.fullName,
      status: user.status,
      referenceId: user.referenceId,
      submittedAt: user.createdAt,
      decidedAt: user.approvedAt ?? null,
      rejectionReason: user.rejectionReason ?? null,
    };
  },
  async requestPasswordReset() {
    await delay(500);
    // Intentionally generic: never reveal whether an account exists.
  },
  async changePassword({ currentPassword, newPassword }) {
    await delay(400);
    const user = requireUser();
    if (user.password !== currentPassword) {
      throw mockError(400, 'INVALID_PASSWORD', 'Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    commit();
  },
};

export const authService: AuthService = env.useMockApi ? mockAuthService : httpAuthService;
