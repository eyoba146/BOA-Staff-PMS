import { userRepository } from '../../repositories/user.repository.js';
import { positionRepository } from '../../repositories/position.repository.js';
import { toPublicUser, PublicUser } from '../auth/auth.service.js';
import { ApiError } from '../../utils/apiError.js';
import { sendTransactionalEmail } from '../../config/brevo.js';
import { uploadProfilePhoto } from '../../config/cloudinary.js';
import { renderApprovalEmail, renderRejectionEmail, renderVerificationCodeEmail } from '../../utils/emailTemplates.js';
import { recordAudit } from '../audit/audit.service.js';
import { verificationRepository } from '../../repositories/verification.repository.js';
import { generateVerificationCode } from '../../utils/code.js';
import { invalidateOverviewCache } from '../performance/performance.service.js';

let cachedStaffList: PublicUser[] | null = null;
let cachedStaffListTime = 0;
let cachedPendingStaff: PublicUser[] | null = null;
let cachedPendingStaffTime = 0;
const STAFF_CACHE_TTL = 25000;

export function invalidateStaffCache() {
  cachedStaffList = null;
  cachedStaffListTime = 0;
  cachedPendingStaff = null;
  cachedPendingStaffTime = 0;
}

export const staffService = {
  async list(filter?: { status?: string; search?: string }): Promise<PublicUser[]> {
    if (!filter || (!filter.status && !filter.search)) {
      if (cachedStaffList && Date.now() - cachedStaffListTime < STAFF_CACHE_TTL) {
        return cachedStaffList;
      }
      const users = await userRepository.listStaff();
      const result = users.map(toPublicUser);
      cachedStaffList = result;
      cachedStaffListTime = Date.now();
      return result;
    }
    const users = await userRepository.listStaff(filter);
    return users.map(toPublicUser);
  },

  async getById(id: string): Promise<PublicUser> {
    if (cachedStaffList && Date.now() - cachedStaffListTime < STAFF_CACHE_TTL) {
      const match = cachedStaffList.find((u) => u.id === id);
      if (match) return match;
    }
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'staff') {
      throw ApiError.notFound('Staff member not found.');
    }
    if (user.status === 'pending_email_verification') {
      throw ApiError.notFound('Staff member not found or email verification pending.');
    }
    return toPublicUser(user);
  },

  async listPending(): Promise<PublicUser[]> {
    if (cachedPendingStaff && Date.now() - cachedPendingStaffTime < STAFF_CACHE_TTL) {
      return cachedPendingStaff;
    }
    if (cachedStaffList && Date.now() - cachedStaffListTime < STAFF_CACHE_TTL) {
      return cachedStaffList.filter((u) => u.status === 'pending_approval');
    }
    const pending = await userRepository.findPendingStaff();
    const result = pending.map(toPublicUser);
    cachedPendingStaff = result;
    cachedPendingStaffTime = Date.now();
    return result;
  },

  async approve(
    id: string,
    opts?: { employeeId?: string; kpiIds?: string[] },
    managerId?: string,
    ipAddress?: string,
  ): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'staff') {
      throw ApiError.notFound('Staff candidate not found.');
    }

    if (user.status !== 'pending_approval') {
      throw ApiError.conflict('Only verified pending registrations can be approved.');
    }

    if (!user.emailVerified) {
      throw ApiError.badRequest('Candidate must complete email verification before manager approval.');
    }

    let assignedEmpId = opts?.employeeId?.trim() || user.employeeId?.trim();
    if (!assignedEmpId) {
      assignedEmpId = await userRepository.getNextStaffEmployeeId();
    }

    // Check Employee ID uniqueness among other registered users
    const duplicate = await userRepository.findByEmployeeId(assignedEmpId);
    if (duplicate && duplicate.id !== id) {
      throw ApiError.conflict(
        `Employee ID "${assignedEmpId}" is already assigned to ${duplicate.fullName}.`,
        'DUPLICATE_EMPLOYEE_ID',
        { employeeId: `Employee ID "${assignedEmpId}" is already assigned to ${duplicate.fullName}.` },
      );
    }

    // Verify position is valid
    const pos = await positionRepository.findByName(user.position);
    if (!pos) {
      throw ApiError.badRequest(`The position "${user.position}" is not an approved branch position.`);
    }

    const approved = await userRepository.approveStaff(id, assignedEmpId, opts?.kpiIds);
    if (!approved) {
      throw ApiError.internal('Failed to approve candidate.');
    }

    // Dispatch approval notice email via Brevo
    await sendTransactionalEmail({
      to: approved.email,
      toName: approved.fullName,
      subject: 'Bank of Abyssinia — Account Approved',
      htmlContent: renderApprovalEmail({
        fullName: approved.fullName,
        employeeId: assignedEmpId,
        position: approved.position,
        branchName: approved.branchName,
      }),
    });

    await recordAudit({
      action: 'STAFF_APPROVED',
      actorId: managerId,
      details: { staffId: id, employeeId: assignedEmpId, position: approved.position },
      ipAddress,
    });

    invalidateOverviewCache();
    invalidateStaffCache();

    return toPublicUser(approved);
  },

  async reject(id: string, reason: string, managerId?: string, ipAddress?: string): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'staff') {
      throw ApiError.notFound('Staff candidate not found.');
    }

    if (user.status !== 'pending_approval') {
      throw ApiError.conflict('Only verified pending registrations can be rejected.');
    }

    const rejected = await userRepository.rejectStaff(id, reason);
    if (!rejected) {
      throw ApiError.internal('Failed to reject registration.');
    }

    // Dispatch rejection notice email via Brevo
    await sendTransactionalEmail({
      to: rejected.email,
      toName: rejected.fullName,
      subject: 'Bank of Abyssinia — Staff Registration Update',
      htmlContent: renderRejectionEmail({
        fullName: rejected.fullName,
        referenceId: rejected.referenceId,
        reason,
        branchName: rejected.branchName,
      }),
    });

    await recordAudit({
      action: 'STAFF_REJECTED',
      actorId: managerId,
      details: { staffId: id, reason },
      ipAddress,
    });

    invalidateOverviewCache();
    invalidateStaffCache();

    return toPublicUser(rejected);
  },

  async setStatus(
    id: string,
    status: 'active' | 'deactivated',
    managerId?: string,
    ipAddress?: string,
  ): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user || user.role !== 'staff') {
      throw ApiError.notFound('Staff member not found.');
    }

    if (
      user.status === 'pending_approval' ||
      user.status === 'rejected' ||
      user.status === 'pending_email_verification'
    ) {
      throw ApiError.conflict('Use approve/reject workflow for candidate registrations.');
    }

    const updated = await userRepository.setStaffStatus(id, status);
    if (!updated) {
      throw ApiError.internal('Failed to update staff status.');
    }

    await recordAudit({
      action: `STAFF_${status.toUpperCase()}`,
      actorId: managerId,
      details: { staffId: id, status },
      ipAddress,
    });

    invalidateOverviewCache();
    invalidateStaffCache();

    return toPublicUser(updated);
  },

  async updateMyProfile(
    userId: string,
    req: { phone?: string; avatarUrl?: string | null },
    ipAddress?: string,
  ): Promise<PublicUser> {
    let avatarUrl = req.avatarUrl;
    if (avatarUrl && avatarUrl.startsWith('data:')) {
      avatarUrl = await uploadProfilePhoto(avatarUrl, userId);
    }

    const updated = await userRepository.updateProfile(userId, {
      ...(req.phone ? { phone: req.phone } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    });
    if (!updated) {
      throw ApiError.notFound('User not found.');
    }

    await recordAudit({
      action: 'PROFILE_UPDATED',
      actorId: userId,
      details: { fields: Object.keys(req) },
      ipAddress,
    });

    return toPublicUser(updated);
  },

  async requestEmailChange(userId: string, data: { newEmail: string }, ipAddress?: string) {
    const newEmail = data.newEmail?.trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw ApiError.badRequest('Please enter a valid email address.');
    }

    const staff = await userRepository.findById(userId);
    if (!staff || staff.role !== 'staff') {
      throw ApiError.notFound('Staff account not found.');
    }

    if (staff.email.toLowerCase() === newEmail) {
      throw ApiError.badRequest('New email address must be different from current email.');
    }

    const existing = await userRepository.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw ApiError.conflict('This email address is already in use by another account.');
    }

    const code = generateVerificationCode();
    const codeRecord = await verificationRepository.createCode({
      target: newEmail,
      code,
      purpose: 'email_verification',
      expiresInSeconds: 300,
      cooldownSeconds: 60,
    });

    await sendTransactionalEmail({
      to: newEmail,
      toName: staff.fullName,
      subject: 'Bank of Abyssinia — Verify Staff Email Update',
      htmlContent: renderVerificationCodeEmail({
        fullName: staff.fullName,
        code,
        purpose: 'email_change',
        branchName: staff.branchName,
      }),
    });

    await recordAudit({
      action: 'REQUEST_STAFF_EMAIL_CHANGE',
      actorId: userId,
      details: { staffId: userId, fromEmail: staff.email, newEmail },
      ipAddress,
    });

    return {
      success: true,
      message: `Verification code sent to ${newEmail}.`,
      expiresAt: codeRecord.expiresAt.toISOString(),
      resendAfter: codeRecord.resendAfter.toISOString(),
      serverTime: new Date().toISOString(),
    };
  },

  async verifyEmailChange(userId: string, data: { newEmail: string; code: string }, ipAddress?: string): Promise<PublicUser> {
    const newEmail = data.newEmail?.trim().toLowerCase();
    const code = data.code?.trim();

    if (!newEmail || !code) {
      throw ApiError.badRequest('New email address and 6-digit verification code are required.');
    }

    const staff = await userRepository.findById(userId);
    if (!staff || staff.role !== 'staff') {
      throw ApiError.notFound('Staff account not found.');
    }

    const validCode = await verificationRepository.findLatest(newEmail, 'email_verification');
    if (!validCode || validCode.consumed || new Date() > validCode.expiresAt) {
      throw ApiError.badRequest('Verification code has expired or was not requested. Please request a new code.');
    }

    if (!verificationRepository.verifyHash(code, validCode.codeHash)) {
      throw ApiError.badRequest('Incorrect verification code. Please check your email and try again.');
    }

    // Verify uniqueness again
    const existing = await userRepository.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw ApiError.conflict('This email address is already in use by another account.');
    }

    await verificationRepository.markConsumed(validCode.id);

    const updated = await userRepository.updateProfile(userId, { email: newEmail });
    if (!updated) {
      throw ApiError.internal('Failed to update email address.');
    }

    await recordAudit({
      action: 'VERIFY_STAFF_EMAIL_CHANGE',
      actorId: userId,
      details: { staffId: userId, previousEmail: staff.email, updatedEmail: newEmail },
      ipAddress,
    });

    return toPublicUser(updated);
  },

  async listDirectory(): Promise<PublicUser[]> {
    const activeUsers = await userRepository.listDirectory();
    return activeUsers.map(toPublicUser);
  },

  async getNextEmployeeId(): Promise<string> {
    return userRepository.getNextStaffEmployeeId();
  },
};
