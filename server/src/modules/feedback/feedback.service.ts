import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { realtimeService } from '../realtime/realtime.service.js';

interface CachedFeedback {
  data: any;
  timestamp: number;
}

const feedbackCache = new Map<string, CachedFeedback>();
const FEEDBACK_CACHE_TTL = 30000;

export function invalidateFeedbackCache(staffId?: string) {
  if (staffId) {
    feedbackCache.delete(`received_${staffId}`);
    feedbackCache.delete('all_');
    feedbackCache.delete(`all_${staffId}`);
  } else {
    feedbackCache.clear();
  }
}

export async function listReceivedFeedback(staffId: string) {
  const cacheKey = `received_${staffId}`;
  const cached = feedbackCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEEDBACK_CACHE_TTL) {
    return cached.data;
  }

  const list = await prisma.feedback.findMany({
    where: { staffId },
    select: {
      id: true,
      staffId: true,
      managerId: true,
      subject: true,
      message: true,
      period: true,
      periodLabel: true,
      kpiId: true,
      readAt: true,
      createdAt: true,
      staff: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = list.map((f: any) => ({
    id: f.id,
    staffId: f.staffId,
    staffName: f.staff.fullName,
    managerId: f.managerId,
    managerName: f.manager.fullName,
    subject: f.subject,
    message: f.message,
    period: f.period,
    periodLabel: f.periodLabel,
    kpiId: f.kpiId,
    kpiName: f.kpi?.name ?? null,
    readAt: f.readAt ? f.readAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
  }));

  feedbackCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function listAllFeedback(filter?: { staffId?: string }) {
  const cacheKey = `all_${filter?.staffId ?? ''}`;
  const cached = feedbackCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEEDBACK_CACHE_TTL) {
    return cached.data;
  }

  const where: any = {};
  if (filter?.staffId) {
    where.staffId = filter.staffId;
  }

  const list = await prisma.feedback.findMany({
    where,
    select: {
      id: true,
      staffId: true,
      managerId: true,
      subject: true,
      message: true,
      period: true,
      periodLabel: true,
      kpiId: true,
      readAt: true,
      createdAt: true,
      staff: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = list.map((f: any) => ({
    id: f.id,
    staffId: f.staffId,
    staffName: f.staff.fullName,
    managerId: f.managerId,
    managerName: f.manager.fullName,
    subject: f.subject,
    message: f.message,
    period: f.period,
    periodLabel: f.periodLabel,
    kpiId: f.kpiId,
    kpiName: f.kpi?.name ?? null,
    readAt: f.readAt ? f.readAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
  }));

  feedbackCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function createFeedback(managerId: string, input: any) {
  const staff = await prisma.user.findFirst({
    where: { id: input.staffId, role: 'staff', status: 'active' },
  });

  if (!staff) {
    throw ApiError.badRequest('Select an active staff member.');
  }

  const created = await prisma.feedback.create({
    data: {
      staffId: staff.id,
      managerId,
      subject: input.subject.trim(),
      message: input.message.trim(),
      period: input.period || null,
      periodLabel: input.periodLabel || null,
      kpiId: input.kpiId || null,
    },
    include: {
      staff: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
  });

  await recordAuditLog({
    action: 'CREATE_FEEDBACK',
    actorId: managerId,
    details: `Provided performance feedback to ${staff.fullName} ("${created.subject}")`,
  });

  const dto = {
    id: created.id,
    staffId: created.staffId,
    staffName: created.staff.fullName,
    managerId: created.managerId,
    managerName: created.manager.fullName,
    subject: created.subject,
    message: created.message,
    period: created.period,
    periodLabel: created.periodLabel,
    kpiId: created.kpiId,
    kpiName: created.kpi?.name ?? null,
    readAt: null,
    createdAt: created.createdAt.toISOString(),
  };

  realtimeService.sendToUser(input.staffId, 'feedback_created', dto);
  realtimeService.notifyCountInvalidated([input.staffId]);
  invalidateFeedbackCache(input.staffId);

  return dto;
}

export async function markFeedbackRead(id: string, userId: string) {
  const fb = await prisma.feedback.findUnique({ where: { id } });
  if (!fb) {
    throw ApiError.notFound('Feedback item not found.');
  }

  if (fb.staffId !== userId) {
    throw ApiError.forbidden('Only recipient can mark feedback as read.');
  }

  const updated = await prisma.feedback.update({
    where: { id },
    data: { readAt: new Date() },
    include: {
      staff: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
  });

  realtimeService.notifyCountInvalidated([userId]);
  invalidateFeedbackCache(userId);

  return {
    id: updated.id,
    staffId: updated.staffId,
    staffName: updated.staff.fullName,
    managerId: updated.managerId,
    managerName: updated.manager.fullName,
    subject: updated.subject,
    message: updated.message,
    period: updated.period,
    periodLabel: updated.periodLabel,
    kpiId: updated.kpiId,
    kpiName: updated.kpi?.name ?? null,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}
