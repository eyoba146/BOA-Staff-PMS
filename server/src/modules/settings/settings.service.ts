import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';

export async function getSettings() {
  const s = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      branchName: 'Finfine Main Branch',
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

  return {
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
