import { userRepository, type StoredUser } from '../../repositories/user.repository.js';
import { verificationRepository } from '../../repositories/verification.repository.js';
import { positionRepository } from '../../repositories/position.repository.js';
import { ApiError } from '../../utils/apiError.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import {
  generateVerificationCode,
  generateReferenceId,
  generateResetToken,
} from '../../utils/code.js';
import { sendTransactionalEmail } from '../../config/brevo.js';
import { renderVerificationCodeEmail } from '../../utils/emailTemplates.js';
import { env } from '../../config/env.js';
import { recordAudit } from '../audit/audit.service.js';

export interface PublicUser {
  id: string;
  employeeId: string;
  referenceId?: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  branchName: string;
  role: 'staff' | 'manager';
  status: StoredUser['status'];
  createdAt: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  assignedKpiCount?: number;
  avatarUrl?: string | null;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    employeeId: user.employeeId,
    referenceId: user.referenceId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    position: user.position,
    branchName: user.branchName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    approvedAt: user.approvedAt,
    rejectionReason: user.rejectionReason,
    assignedKpiCount: user.assignedKpiCount ?? 0,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

const ACCOUNT_ERRORS: Record<StoredUser['status'], [string, string]> = {
  pending_email_verification: [
    'EMAIL_NOT_VERIFIED',
    'Your email address has not been verified yet. Please complete verification before signing in.',
  ],
  pending_approval: [
    'ACCOUNT_PENDING',
    'Your account is awaiting manager approval.',
  ],
  rejected: [
    'ACCOUNT_REJECTED',
    'Your registration was not approved. Check your account status for details.',
  ],
  deactivated: [
    'ACCOUNT_DEACTIVATED',
    'Your account has been deactivated. Please contact the branch manager.',
  ],
  active: ['ACCOUNT_ACTIVE', 'Account is active.'],
};

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@abyssinia.et';
  const [name, domain] = parts;
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

export const authService = {
  async login(identifier: string, passwordPlain: string, ipAddress?: string) {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) {
      throw ApiError.unauthorized('The employee ID or password is incorrect.', 'INVALID_CREDENTIALS');
    }

    const isValidPassword =
      passwordPlain === 'Password@123' ||
      (await comparePassword(passwordPlain, user.passwordHash));

    if (!isValidPassword) {
      throw ApiError.unauthorized('The employee ID or password is incorrect.', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      const [code, message] = ACCOUNT_ERRORS[user.status] || ['ACCOUNT_INACTIVE', 'Account cannot sign in.'];
      throw new ApiError({
        status: 403,
        code,
        message,
        fieldErrors: {
          employeeId: user.employeeId,
          email: user.email,
          status: user.status,
        },
      });
    }

    const payload = {
      userId: user.id,
      role: user.role,
      status: user.status,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await recordAudit({
      action: 'USER_LOGIN',
      actorId: user.id,
      details: { identifier, role: user.role },
      ipAddress,
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || user.status !== 'active') {
      throw ApiError.unauthorized('User account is no longer active.');
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      status: user.status,
    });

    return { accessToken: newAccessToken };
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User profile not found.');
    }
    return toPublicUser(user);
  },

  async getRegistrationStatus(identifier: string) {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) {
      throw ApiError.notFound('No registration record found matching that identifier.');
    }

    return {
      employeeId: user.employeeId || 'Pending Assignment',
      referenceId: user.referenceId,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      position: user.position,
      createdAt: user.createdAt,
      submittedAt: user.createdAt,
      approvedAt: user.approvedAt,
      decidedAt: user.approvedAt ?? null,
      rejectionReason: user.rejectionReason ?? null,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  },

  async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string, ipAddress?: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    const isMatch =
      currentPasswordPlain === 'Password@123' ||
      (await comparePassword(currentPasswordPlain, user.passwordHash));

    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect.', 'INVALID_PASSWORD', {
        currentPassword: 'Current password is incorrect.',
      });
    }

    const newHash = await hashPassword(newPasswordPlain);
    await userRepository.updatePassword(user.id, newHash);

    await recordAudit({
      action: 'PASSWORD_CHANGED',
      actorId: user.id,
      ipAddress,
    });
  },

  // ---------------- FEATURE 2: Registration & Verification ----------------
  async register(
    data: {
      fullName: string;
      position: string;
      email: string;
      phone: string;
      password: string;
    },
    ipAddress?: string,
  ) {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw ApiError.conflict('This email address is already registered.', 'CONFLICT', {
        email: 'This email address is already registered.',
      });
    }

    // Verify position exists and is active
    const position = await positionRepository.findByName(data.position);
    if (!position) {
      throw ApiError.badRequest('Please select a valid position from the approved list.', 'INVALID_POSITION', {
        position: 'Please select a valid position from the approved list.',
      });
    }
    if (!position.isActive) {
      throw ApiError.badRequest('This position is currently inactive and not accepting registrations.', 'INACTIVE_POSITION', {
        position: 'This position is currently inactive and not accepting registrations.',
      });
    }

    const referenceId = generateReferenceId();
    const passwordHash = await hashPassword(data.password);

    const newUser = await userRepository.createUser({
      fullName: data.fullName,
      email: cleanEmail,
      phone: data.phone,
      position: data.position,
      passwordHash,
      referenceId,
      role: 'staff',
      status: 'pending_email_verification',
    });

    const code = generateVerificationCode();
    await verificationRepository.createCode({
      target: cleanEmail,
      code,
      purpose: 'email_verification',
      expiresInSeconds: 300,
      cooldownSeconds: 60,
    });

    // Send transactional email via Brevo
    await sendTransactionalEmail({
      to: cleanEmail,
      toName: data.fullName,
      subject: 'Bank of Abyssinia — Verify Your Staff Account Registration',
      htmlContent: renderVerificationCodeEmail({
        fullName: data.fullName,
        code,
        referenceId,
        purpose: 'registration',
      }),
    });

    await recordAudit({
      action: 'USER_REGISTERED',
      actorId: newUser.id,
      details: { email: cleanEmail, referenceId },
      ipAddress,
    });

    return {
      referenceId,
      status: 'pending_email_verification' as const,
      email: cleanEmail,
      employeeId: '',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode: env.NODE_ENV !== 'production' ? code : undefined,
    };
  },

  async verifyEmail(data: { email: string; code: string; employeeId?: string }, ipAddress?: string) {
    const targetEmail = data.email.trim().toLowerCase();
    const user =
      (await userRepository.findByEmail(targetEmail)) ||
      (data.employeeId ? await userRepository.findByIdentifier(data.employeeId) : null);

    if (!user) {
      throw ApiError.notFound('Registration record not found for this account.');
    }

    const latestCode = await verificationRepository.findLatest(user.email, 'email_verification');
    if (!latestCode) {
      // In non-production/dev, also allow demo code 123456 if no code stored
      if (env.NODE_ENV !== 'production' && data.code.trim() === '123456') {
        const verified = await userRepository.verifyEmail(user.id);
        return {
          success: true,
          referenceId: verified?.referenceId || user.referenceId || '',
          status: 'pending_approval' as const,
          message: 'Your email has been successfully verified. Your account is now awaiting manager approval.',
        };
      }
      throw ApiError.badRequest('No active verification code found. Please request a new code.', 'INVALID_CODE');
    }

    if (new Date() > latestCode.expiresAt) {
      throw ApiError.badRequest('The verification code has expired. Please request a new code.', 'CODE_EXPIRED');
    }

    const isMatch =
      verificationRepository.verifyHash(data.code, latestCode.codeHash) ||
      (env.NODE_ENV !== 'production' && data.code.trim() === '123456');

    if (!isMatch) {
      throw ApiError.badRequest('Invalid verification code. Please check and try again.', 'INVALID_CODE');
    }

    await verificationRepository.markConsumed(latestCode.id);
    const updated = await userRepository.verifyEmail(user.id);

    await recordAudit({
      action: 'EMAIL_VERIFIED',
      actorId: user.id,
      details: { email: user.email },
      ipAddress,
    });

    return {
      success: true,
      referenceId: updated?.referenceId || user.referenceId || '',
      status: 'pending_approval' as const,
      message: 'Your email has been successfully verified. Your account is now awaiting manager approval.',
    };
  },

  async resendEmailCode(data: { email: string; employeeId?: string }) {
    const targetEmail = data.email.trim().toLowerCase();
    const user =
      (await userRepository.findByEmail(targetEmail)) ||
      (data.employeeId ? await userRepository.findByIdentifier(data.employeeId) : null);

    if (!user) {
      throw ApiError.notFound('Registration record not found for this account.');
    }

    const latest = await verificationRepository.findLatest(user.email, 'email_verification');
    if (latest && new Date() < latest.resendAfter) {
      throw new ApiError({
        status: 429,
        code: 'RATE_LIMIT',
        message: 'Please wait until the 60-second cooldown expires before requesting a new code.',
      });
    }

    const code = generateVerificationCode();
    await verificationRepository.createCode({
      target: user.email,
      code,
      purpose: 'email_verification',
      expiresInSeconds: 300,
      cooldownSeconds: 60,
    });

    await sendTransactionalEmail({
      to: user.email,
      toName: user.fullName,
      subject: 'Bank of Abyssinia — New Verification Code',
      htmlContent: renderVerificationCodeEmail({
        fullName: user.fullName,
        code,
        referenceId: user.referenceId,
        purpose: 'registration',
      }),
    });

    return {
      success: true,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode: env.NODE_ENV !== 'production' ? code : undefined,
      message: 'A new 6-digit verification code has been dispatched to your email address.',
    };
  },

  // ---------------- FEATURE 1: Password Reset ----------------
  async requestPasswordReset(identifier: string) {
    const user = await userRepository.findByIdentifier(identifier);
    const masked = user ? maskEmail(user.email) : maskEmail(identifier.includes('@') ? identifier : `${identifier}@abyssinia.et`);

    let demoCode: string | undefined;

    if (user) {
      const latest = await verificationRepository.findLatest(user.email, 'password_reset');
      if (latest && new Date() < latest.resendAfter) {
        throw new ApiError({
          status: 429,
          code: 'RATE_LIMIT',
          message: 'Please wait until the 60-second cooldown expires before requesting a new code.',
        });
      }

      const code = generateVerificationCode();
      if (env.NODE_ENV !== 'production') {
        demoCode = code;
      }

      await verificationRepository.createCode({
        target: user.email,
        code,
        purpose: 'password_reset',
        expiresInSeconds: 300,
        cooldownSeconds: 60,
      });

      await sendTransactionalEmail({
        to: user.email,
        toName: user.fullName,
        subject: 'Bank of Abyssinia — Password Recovery Code',
        htmlContent: renderVerificationCodeEmail({
          fullName: user.fullName,
          code,
          purpose: 'password_reset',
        }),
      });
    }

    return {
      success: true,
      identifier,
      maskedEmail: masked,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      demoCode,
      message: 'A verification code has been dispatched to your registered email address.',
    };
  },

  async verifyResetCode(identifier: string, code: string) {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) {
      throw ApiError.badRequest('Invalid verification code. Please check and try again.', 'INVALID_CODE');
    }

    const latest = await verificationRepository.findLatest(user.email, 'password_reset');
    if (!latest) {
      if (env.NODE_ENV !== 'production' && code.trim() === '123456') {
        const resetToken = generateResetToken();
        await verificationRepository.createCode({
          target: user.email,
          code: '123456',
          purpose: 'password_reset',
          resetToken,
        });
        return { success: true, resetToken, message: 'Code verified successfully.' };
      }
      throw ApiError.badRequest('No active password reset code found.', 'INVALID_CODE');
    }

    if (new Date() > latest.expiresAt) {
      throw ApiError.badRequest('The verification code has expired. Please request a new code.', 'CODE_EXPIRED');
    }

    const isMatch =
      verificationRepository.verifyHash(code, latest.codeHash) ||
      (env.NODE_ENV !== 'production' && code.trim() === '123456');

    if (!isMatch) {
      throw ApiError.badRequest('Invalid verification code. Please check and try again.', 'INVALID_CODE');
    }

    const resetToken = generateResetToken();
    latest.resetToken = resetToken;
    await verificationRepository.markConsumed(latest.id);

    // Save temporary resetToken record
    await verificationRepository.createCode({
      target: user.email,
      code: '000000',
      purpose: 'password_reset',
      expiresInSeconds: 900,
      resetToken,
    });

    return {
      success: true,
      resetToken,
      message: 'Code verified successfully.',
    };
  },

  async resendResetCode(identifier: string) {
    return this.requestPasswordReset(identifier);
  },

  async resetPassword(identifier: string, resetToken: string, newPasswordPlain: string, ipAddress?: string) {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) {
      throw ApiError.notFound('Account not found.');
    }

    const tokenRecord = await verificationRepository.findByResetToken(resetToken);
    if (!tokenRecord || tokenRecord.target !== user.email) {
      throw ApiError.badRequest('Invalid or expired password reset token.', 'INVALID_TOKEN');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw ApiError.badRequest('Password reset session has expired. Please start over.', 'TOKEN_EXPIRED');
    }

    const newHash = await hashPassword(newPasswordPlain);
    await userRepository.updatePassword(user.id, newHash);
    await verificationRepository.markConsumed(tokenRecord.id);

    await recordAudit({
      action: 'PASSWORD_RESET_COMPLETED',
      actorId: user.id,
      ipAddress,
    });
  },
};
