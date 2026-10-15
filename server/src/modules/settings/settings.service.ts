import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { userRepository } from '../../repositories/user.repository.js';
import { verificationRepository } from '../../repositories/verification.repository.js';
import { sendTransactionalEmail } from '../../config/brevo.js';
import { renderVerificationCodeEmail } from '../../utils/emailTemplates.js';
import { toPublicUser } from '../auth/auth.service.js';
import { generateVerificationCode } from '../../utils/code.js';
import { invalidateOverviewCache } from '../performance/performance.service.js';

let cachedSettings: any = null;
let cachedSettingsExpiry = 0;

export function invalidateSettingsCache() {
  cachedSettings = null;
  cachedSettingsExpiry = 0;
}

export async function getSettings() {
  const now = Date.now();
  if (cachedSettings && now < cachedSettingsExpiry) {
    return cachedSettings;
  }

  let s = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
  if (!s) {
    s = await prisma.systemSettings.create({
      data: {
        id: 'default',
        branchName: 'Addis Ababa Branch',
        branchCode: 'BOA-001',
        onTargetMin: 85,
        needsAttentionMin: 70,
        thresholdsStatus: 'pending_validation',
        allowEditSubmitted: true,
        backdateDays: 3,
        entryPolicyStatus: 'pending_validation',
        weightingEnabled: true,
      },
    });
  }

  const result = {
    branchName: s.branchName,
    branchCode: s.branchCode,
    thresholds: {
      onTargetMin: s.onTargetMin,
      needsAttentionMin: s.needsAttentionMin,
      status: s.thresholdsStatus,
    },
    entryPolicy: {
      allowEditSubmitted: s.allowEditSubmitted,
      backdateDays: s.backdateDays,
      status: s.entryPolicyStatus,
    },
    weightingEnabled: s.weightingEnabled,
    updatedAt: s.updatedAt.toISOString(),
  };

  cachedSettings = result;
  cachedSettingsExpiry = now + 60000;
  return result;
}

export async function getPublicSettings() {
  const s = await getSettings();
  return {
    branchName: s.branchName,
    branchCode: s.branchCode,
  };
}

export async function updateSettings(data: any, managerId: string) {
  const branchName = data.branchName?.trim();
  const branchCode = data.branchCode?.trim().toUpperCase();

  if (!branchName) {
    throw ApiError.badRequest('Branch name is required.');
  }
  if (!branchCode) {
    throw ApiError.badRequest('Branch code is required.');
  }

  const onTargetMin = data.thresholds?.onTargetMin !== undefined ? Number(data.thresholds.onTargetMin) : undefined;
  const needsAttentionMin = data.thresholds?.needsAttentionMin !== undefined ? Number(data.thresholds.needsAttentionMin) : undefined;

  if (onTargetMin !== undefined && needsAttentionMin !== undefined) {
    if (needsAttentionMin >= onTargetMin) {
      throw ApiError.badRequest('Needs attention threshold must be lower than On target minimum.');
    }
  }

  const current = await prisma.systemSettings.findUnique({ where: { id: 'default' } });

  const updated = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {
      branchName,
      branchCode,
      ...(onTargetMin !== undefined ? { onTargetMin } : {}),
      ...(needsAttentionMin !== undefined ? { needsAttentionMin } : {}),
      ...(data.thresholds?.status ? { thresholdsStatus: data.thresholds.status } : {}),
      ...(data.entryPolicy?.allowEditSubmitted !== undefined ? { allowEditSubmitted: Boolean(data.entryPolicy.allowEditSubmitted) } : {}),
      ...(data.entryPolicy?.backdateDays !== undefined ? { backdateDays: Number(data.entryPolicy.backdateDays) } : {}),
      ...(data.entryPolicy?.status ? { entryPolicyStatus: data.entryPolicy.status } : {}),
      ...(data.weightingEnabled !== undefined ? { weightingEnabled: Boolean(data.weightingEnabled) } : {}),
    },
    create: {
      id: 'default',
      branchName,
      branchCode,
      onTargetMin: onTargetMin ?? 85,
      needsAttentionMin: needsAttentionMin ?? 70,
      thresholdsStatus: data.thresholds?.status ?? 'pending_validation',
      allowEditSubmitted: data.entryPolicy?.allowEditSubmitted ?? true,
      backdateDays: data.entryPolicy?.backdateDays ?? 3,
      entryPolicyStatus: data.entryPolicy?.status ?? 'pending_validation',
      weightingEnabled: data.weightingEnabled ?? true,
    },
  });

  if (current?.branchName !== branchName) {
    await prisma.user.updateMany({
      data: { branchName },
    });
  }

  await recordAuditLog({
    action: 'UPDATE_SETTINGS',
    actorId: managerId,
    details: `Updated system settings for branch ${branchCode} (${branchName})`,
  });

  invalidateSettingsCache();
  invalidateOverviewCache();

  return {
    branchName: updated.branchName,
    branchCode: updated.branchCode,
    thresholds: {
      onTargetMin: updated.onTargetMin,
      needsAttentionMin: updated.needsAttentionMin,
      status: updated.thresholdsStatus,
    },
    entryPolicy: {
      allowEditSubmitted: updated.allowEditSubmitted,
      backdateDays: updated.backdateDays,
      status: updated.entryPolicyStatus,
    },
    weightingEnabled: updated.weightingEnabled,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function updateManagerProfile(managerId: string, data: { fullName: string }) {
  const fullName = data.fullName?.trim();
  if (!fullName || fullName.length < 3) {
    throw ApiError.badRequest('Manager full name must be at least 3 characters.');
  }

  const manager = await userRepository.findById(managerId);
  if (!manager || manager.role !== 'manager') {
    throw ApiError.notFound('Manager account not found.');
  }

  const updated = await userRepository.updateUserProfile(managerId, { fullName });
  if (!updated) {
    throw ApiError.internal('Failed to update manager profile.');
  }

  await recordAuditLog({
    action: 'UPDATE_MANAGER_PROFILE',
    actorId: managerId,
    details: `Updated manager name from "${manager.fullName}" to "${fullName}"`,
  });

  return toPublicUser(updated);
}

export async function requestManagerEmailChange(managerId: string, data: { newEmail: string }) {
  const newEmail = data.newEmail?.trim().toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw ApiError.badRequest('Please enter a valid email address.');
  }

  const manager = await userRepository.findById(managerId);
  if (!manager || manager.role !== 'manager') {
    throw ApiError.notFound('Manager account not found.');
  }

  if (manager.email.toLowerCase() === newEmail) {
    throw ApiError.badRequest('New email address must be different from current email.');
  }

  const existing = await userRepository.findByEmail(newEmail);
  if (existing && existing.id !== managerId) {
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
    toName: manager.fullName,
    subject: 'Bank of Abyssinia — Verify Manager Email Update',
    htmlContent: renderVerificationCodeEmail({
      fullName: manager.fullName,
      code,
      purpose: 'email_change',
      branchName: manager.branchName,
    }),
  });

  await recordAuditLog({
    action: 'REQUEST_MANAGER_EMAIL_CHANGE',
    actorId: managerId,
    details: `Requested manager email change from ${manager.email} to ${newEmail}`,
  });

  return {
    success: true,
    message: `Verification code sent to ${newEmail}.`,
    expiresAt: codeRecord.expiresAt.toISOString(),
    resendAfter: codeRecord.resendAfter.toISOString(),
    serverTime: new Date().toISOString(),
  };
}

export async function verifyManagerEmailChange(managerId: string, data: { newEmail: string; code: string }) {
  const newEmail = data.newEmail?.trim().toLowerCase();
  const code = data.code?.trim();

  if (!newEmail || !code) {
    throw ApiError.badRequest('New email address and 6-digit verification code are required.');
  }

  const manager = await userRepository.findById(managerId);
  if (!manager || manager.role !== 'manager') {
    throw ApiError.notFound('Manager account not found.');
  }

  const latestCode = await verificationRepository.findLatest(newEmail, 'email_verification');
  if (!latestCode) {
    throw ApiError.badRequest('No active verification code found for this email address.', 'INVALID_CODE');
  }

  if (new Date() > latestCode.expiresAt) {
    throw ApiError.badRequest('The verification code has expired. Please request a new code.', 'CODE_EXPIRED');
  }

  const isMatch = verificationRepository.verifyHash(code, latestCode.codeHash);
  if (!isMatch) {
    throw ApiError.badRequest('Invalid verification code. Please check and try again.', 'INVALID_CODE');
  }

  await verificationRepository.markConsumed(latestCode.id);

  const existing = await userRepository.findByEmail(newEmail);
  if (existing && existing.id !== managerId) {
    throw ApiError.conflict('This email address is already in use by another account.');
  }

  const updated = await userRepository.updateUserProfile(managerId, { email: newEmail });
  if (!updated) {
    throw ApiError.internal('Failed to update email address.');
  }

  await recordAuditLog({
    action: 'VERIFY_MANAGER_EMAIL_CHANGE',
    actorId: managerId,
    details: `Confirmed manager email change from ${manager.email} to ${newEmail}`,
  });

  return {
    success: true,
    message: 'Manager email address updated successfully.',
    user: toPublicUser(updated),
  };
}
