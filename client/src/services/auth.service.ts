import { env } from '@/config/env';
import type {
  AccountStatus,
  AccountStatusResult,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  PasswordResetRequestResponse,
  RegisterRequest,
  RegisterResponse,
  ResendCodeResponse,
  ResendEmailCodeRequest,
  ResendResetCodeRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
  VerifyEmailResponse,
  VerifyResetCodeRequest,
  VerifyResetCodeResponse,
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
  getAccountStatus(employeeId: string): Promise<AccountStatusResult>;
  changePassword(req: ChangePasswordRequest): Promise<void>;

  // Feature 2: Registration & Email verification
  register(req: RegisterRequest): Promise<RegisterResponse>;
  verifyEmail(req: VerifyEmailRequest): Promise<VerifyEmailResponse>;
  resendEmailCode(req: ResendEmailCodeRequest): Promise<ResendCodeResponse>;

  // Feature 1: Multi-step password reset
  requestPasswordReset(identifier: string): Promise<PasswordResetRequestResponse>;
  verifyResetCode(req: VerifyResetCodeRequest): Promise<VerifyResetCodeResponse>;
  resendResetCode(req: ResendResetCodeRequest): Promise<ResendCodeResponse>;
  resetPassword(req: ResetPasswordRequest): Promise<void>;
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
  getAccountStatus: (employeeId) => api.get<AccountStatusResult>('/auth/registration-status', { employeeId }),
  changePassword: (req) => api.post<void>('/auth/change-password', req),

  register: (req) => api.post<RegisterResponse>('/auth/register', req),
  verifyEmail: (req) => api.post<VerifyEmailResponse>('/auth/verify-email', req),
  resendEmailCode: (req) => api.post<ResendCodeResponse>('/auth/resend-email-code', req),

  requestPasswordReset: (identifier) => api.post<PasswordResetRequestResponse>('/auth/forgot-password', { identifier }),
  verifyResetCode: (req) => api.post<VerifyResetCodeResponse>('/auth/verify-reset-code', req),
  resendResetCode: (req) => api.post<ResendCodeResponse>('/auth/resend-reset-code', req),
  resetPassword: (req) => api.post<void>('/auth/reset-password', req),
};

// ---------------- Mock adapter ----------------
const ACCOUNT_ERRORS: Record<AccountStatus, [string, string]> = {
  pending_email_verification: ['EMAIL_NOT_VERIFIED', 'Your email address has not been verified yet. Please complete verification before signing in.'],
  pending_approval: ['ACCOUNT_PENDING', 'Your account is awaiting manager approval.'],
  rejected: ['ACCOUNT_REJECTED', 'Your registration was not approved. Check your account status for details.'],
  deactivated: ['ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact the branch manager.'],
  active: ['ACCOUNT_ACTIVE', 'Account is active.'],
};

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@abyssinia.et';
  const [name, domain] = parts;
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

interface VerificationRecord {
  code: string;
  expiresAt: number;
  resendAfter: number;
  resetToken?: string;
}

const emailVerificationStore = new Map<string, VerificationRecord>();
const passwordResetStore = new Map<string, VerificationRecord>();

const mockAuthService: AuthService = {
  async login({ identifier, password, remember }) {
    await delay(500);
    const id = identifier.trim().toLowerCase();
    const user = getDb().users.find((u) => u.employeeId.toLowerCase() === id || u.email.toLowerCase() === id);
    if (!user || user.password !== password) {
      throw mockError(401, 'INVALID_CREDENTIALS', 'The employee ID or password is incorrect.');
    }
    if (user.status !== 'active') {
      const [code, message] = ACCOUNT_ERRORS[user.status] || ['ACCOUNT_INACTIVE', 'Account cannot sign in.'];
      throw mockError(403, code, message, {
        employeeId: user.employeeId,
        email: user.email,
        status: user.status,
      });
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
    const cleanEmail = req.email.trim().toLowerCase();

    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      fieldErrors.email = 'This email address is already registered.';
    }

    // Verify position exists and is active
    if (db.positions && db.positions.length > 0) {
      const pos = db.positions.find((p) => p.name.toLowerCase() === req.position.trim().toLowerCase());
      if (!pos) {
        fieldErrors.position = 'Please select a valid position from the approved list.';
      } else if (!pos.isActive) {
        fieldErrors.position = 'This position is currently inactive and not accepting registrations.';
      }
    }

    if (Object.keys(fieldErrors).length) {
      throw mockError(409, 'CONFLICT', 'Please correct the highlighted fields.', fieldErrors);
    }

    // Generate unique reference ID (e.g. REG-748291)
    const referenceId = `REG-${Math.floor(100000 + Math.random() * 900000)}`;

    db.users.push({
      id: uid('u'),
      employeeId: '', // To be assigned/confirmed by branch manager upon approval
      fullName: req.fullName.trim(),
      email: cleanEmail,
      phone: req.phone.trim(),
      position: req.position.trim(),
      branchName: db.settings.branchName,
      role: 'staff',
      status: 'pending_email_verification',
      createdAt: nowISO(),
      approvedAt: null,
      rejectionReason: null,
      password: req.password,
      referenceId,
      emailVerified: false,
      emailVerifiedAt: null,
    });
    commit();

    // Setup verification code (5 min expiration, 60s cooldown)
    const demoCode = '123456';
    emailVerificationStore.set(cleanEmail, {
      code: demoCode,
      expiresAt: Date.now() + 300 * 1000,
      resendAfter: Date.now() + 60 * 1000,
    });

    return {
      referenceId,
      status: 'pending_email_verification',
      email: cleanEmail,
      employeeId: '',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode,
    };
  },

  async verifyEmail({ email, code, employeeId }) {
    await delay(500);
    const targetEmail = email?.trim().toLowerCase();
    const empId = employeeId?.trim().toUpperCase();

    const user = getDb().users.find((u) =>
      (targetEmail && u.email.toLowerCase() === targetEmail) ||
      (empId && u.employeeId && u.employeeId.toUpperCase() === empId)
    );
    if (!user) {
      throw mockError(404, 'NOT_FOUND', 'Registration record not found for this account.');
    }

    const storeKey = targetEmail || user.email.toLowerCase() || empId || '';
    const record = emailVerificationStore.get(storeKey) || (empId ? emailVerificationStore.get(empId) : undefined);

    if (record && Date.now() > record.expiresAt) {
      throw mockError(400, 'CODE_EXPIRED', 'The verification code has expired. Please request a new code.');
    }

    const validCode = record ? record.code : '123456';
    if (code.trim() !== validCode && code.trim() !== '123456') {
      throw mockError(400, 'INVALID_CODE', 'Invalid verification code. Please check and try again.');
    }

    // Email verification successful -> advance to pending_approval
    user.status = 'pending_approval';
    user.emailVerified = true;
    user.emailVerifiedAt = nowISO();
    commit();
    emailVerificationStore.delete(storeKey);
    if (empId) emailVerificationStore.delete(empId);

    return {
      success: true,
      referenceId: user.referenceId,
      status: 'pending_approval',
      message: 'Your email has been successfully verified. Your account is now awaiting manager approval.',
    };
  },

  async resendEmailCode({ email, employeeId }) {
    await delay(450);
    const targetEmail = email?.trim().toLowerCase();
    const empId = employeeId?.trim().toUpperCase();

    const user = getDb().users.find((u) =>
      (targetEmail && u.email.toLowerCase() === targetEmail) ||
      (empId && u.employeeId && u.employeeId.toUpperCase() === empId)
    );
    if (!user) {
      throw mockError(404, 'NOT_FOUND', 'Registration record not found for this account.');
    }

    const storeKey = targetEmail || user.email.toLowerCase() || empId || '';
    const record = emailVerificationStore.get(storeKey) || (empId ? emailVerificationStore.get(empId) : undefined);

    if (record && Date.now() < record.resendAfter) {
      throw mockError(429, 'RATE_LIMIT', 'Please wait until the 60-second cooldown expires before requesting a new code.');
    }

    const demoCode = '123456';
    emailVerificationStore.set(storeKey, {
      code: demoCode,
      expiresAt: Date.now() + 300 * 1000,
      resendAfter: Date.now() + 60 * 1000,
    });

    return {
      success: true,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode,
      message: 'A new 6-digit verification code has been dispatched to your email address.',
    };
  },

  async requestPasswordReset(identifier) {
    await delay(500);
    const id = identifier.trim().toLowerCase();
    const user = getDb().users.find((u) => u.employeeId.toLowerCase() === id || u.email.toLowerCase() === id);

    // Generic safe response to avoid account enumeration
    const maskedEmail = user ? maskEmail(user.email) : maskEmail(id.includes('@') ? id : `${id}@abyssinia.et`);
    const demoCode = '123456';
    const key = id;

    passwordResetStore.set(key, {
      code: demoCode,
      resetToken: `rst_${uid('t')}`,
      expiresAt: Date.now() + 300 * 1000,
      resendAfter: Date.now() + 60 * 1000,
    });

    return {
      success: true,
      identifier: identifier.trim(),
      maskedEmail,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode,
      message: 'If an account matches the details provided, a 6-digit verification code has been sent.',
    };
  },

  async verifyResetCode({ identifier, code }) {
    await delay(450);
    const key = identifier.trim().toLowerCase();
    const record = passwordResetStore.get(key);

    if (record && Date.now() > record.expiresAt) {
      throw mockError(400, 'CODE_EXPIRED', 'The verification code has expired. Please request a new code.');
    }

    const validCode = record ? record.code : '123456';
    if (code.trim() !== validCode && code.trim() !== '123456') {
      throw mockError(400, 'INVALID_CODE', 'Invalid verification code. Please check and try again.');
    }

    const resetToken = record?.resetToken || `rst_${uid('t')}`;
    return {
      success: true,
      resetToken,
      message: 'Verification code verified successfully.',
    };
  },

  async resendResetCode({ identifier }) {
    await delay(400);
    const key = identifier.trim().toLowerCase();
    const record = passwordResetStore.get(key);

    if (record && Date.now() < record.resendAfter) {
      throw mockError(429, 'RATE_LIMIT', 'Please wait until the 60-second cooldown expires before requesting a new code.');
    }

    const demoCode = '123456';
    passwordResetStore.set(key, {
      code: demoCode,
      resetToken: record?.resetToken || `rst_${uid('t')}`,
      expiresAt: Date.now() + 300 * 1000,
      resendAfter: Date.now() + 60 * 1000,
    });

    return {
      success: true,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode,
      message: 'A fresh 6-digit verification code has been sent.',
    };
  },

  async resetPassword({ identifier, newPassword }) {
    await delay(500);
    const id = identifier.trim().toLowerCase();
    const user = getDb().users.find((u) => u.employeeId.toLowerCase() === id || u.email.toLowerCase() === id);

    if (user) {
      user.password = newPassword;
      commit();
    }
    passwordResetStore.delete(id);
  },

  async getAccountStatus(identifier) {
    await delay(400);
    const id = identifier.trim().toLowerCase();
    const user = getDb().users.find(
      (u) =>
        u.role === 'staff' &&
        ((u.employeeId && u.employeeId.toLowerCase() === id) ||
          (u.email && u.email.toLowerCase() === id) ||
          (u.referenceId && u.referenceId.toLowerCase() === id)),
    );
    if (!user) throw mockError(404, 'NOT_FOUND', 'No registration record was found matching this identifier.');
    return {
      employeeId: user.employeeId || 'Pending Assignment',
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      referenceId: user.referenceId,
      submittedAt: user.createdAt,
      decidedAt: user.approvedAt ?? null,
      rejectionReason: user.rejectionReason ?? null,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
    };
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
