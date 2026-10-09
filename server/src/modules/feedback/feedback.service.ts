import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';

export async function listReceivedFeedback(staffId: string) {
  const list = await prisma.feedback.findMany({
    where: { staffId },
    include: {
      staff: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return list.map((f: any) => ({
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
}

export async function listAllFeedback(filter?: { staffId?: string }) {
  const where: any = {};
  if (filter?.staffId) {
    where.staffId = filter.staffId;
  }

  const list = await prisma.feedback.findMany({
    where,
    include: {
      staff: { select: { fullName: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return list.map((f: any) => ({
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

  return {
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
