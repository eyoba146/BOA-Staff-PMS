import { userRepository } from '../../repositories/user.repository.js';
import { positionRepository } from '../../repositories/position.repository.js';
import { toPublicUser, PublicUser } from '../auth/auth.service.js';
import { ApiError } from '../../utils/apiError.js';
import { sendTransactionalEmail } from '../../config/brevo.js';
import { renderApprovalEmail, renderRejectionEmail } from '../../utils/emailTemplates.js';
import { recordAudit } from '../audit/audit.service.js';

export const staffService = {
  async list(filter?: { status?: string; search?: string }): Promise<PublicUser[]> {
    const users = await userRepository.listStaff(filter);
    return users.map(toPublicUser);
  },

  async getById(id: string): Promise<PublicUser> {
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
    const pending = await userRepository.findPendingStaff();
    return pending.map(toPublicUser);
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

    const assignedEmpId = opts?.employeeId?.trim() || user.employeeId?.trim();
    if (!assignedEmpId) {
      throw ApiError.badRequest(
        'Official Employee ID must be assigned by management prior to approval.',
        'EMPLOYEE_ID_REQUIRED',
        { employeeId: 'Official Employee ID must be assigned by management prior to approval.' },
      );
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

    return toPublicUser(updated);
  },

  async updateMyProfile(
    userId: string,
    req: { email?: string; phone?: string; avatarUrl?: string | null },
    ipAddress?: string,
  ): Promise<PublicUser> {
    if (req.email) {
      const duplicate = await userRepository.findByEmail(req.email);
      if (duplicate && duplicate.id !== userId) {
        throw ApiError.conflict('This email address is already in use by another user.');
      }
    }

    const updated = await userRepository.updateProfile(userId, req);
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

  async listDirectory(): Promise<PublicUser[]> {
    const activeUsers = await userRepository.listDirectory();
    return activeUsers.map(toPublicUser);
  },
};
