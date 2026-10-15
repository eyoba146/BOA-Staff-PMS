import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { sendTransactionalEmailDetailed } from '../../config/brevo.js';
import { renderCommunicationEmail } from '../../utils/emailTemplates.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { realtimeService } from '../realtime/realtime.service.js';

export type CommunicationType = 'feedback' | 'reminder' | 'warning' | 'appreciation';
export type CommunicationAudience = 'recipient_only' | 'recipient_and_manager';

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
      type: true,
      audience: true,
      subject: true,
      message: true,
      period: true,
      periodLabel: true,
      kpiId: true,
      emailStatus: true,
      emailDeliveredAt: true,
      emailError: true,
      batchId: true,
      readAt: true,
      createdAt: true,
      staff: { select: { fullName: true, employeeId: true, positionTitle: true } },
      manager: { select: { fullName: true } },
      kpi: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = list.map((f: any) => ({
    id: f.id,
    staffId: f.staffId,
    staffName: f.staff.fullName,
    employeeId: f.staff.employeeId,
    position: f.staff.positionTitle,
    managerId: f.managerId,
    managerName: f.manager.fullName,
    type: f.type || 'feedback',
    audience: f.audience || 'recipient_only',
    subject: f.subject,
    message: f.message,
    period: f.period,
    periodLabel: f.periodLabel,
    kpiId: f.kpiId,
    kpiName: f.kpi?.name ?? null,
    emailStatus: f.emailStatus || 'queued',
    emailDeliveredAt: f.emailDeliveredAt ? f.emailDeliveredAt.toISOString() : null,
    readAt: f.readAt ? f.readAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
  }));

  feedbackCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function listAllFeedback(filter?: { staffId?: string; type?: string }) {
  const cacheKey = `all_${filter?.staffId ?? ''}_${filter?.type ?? ''}`;
  const cached = feedbackCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEEDBACK_CACHE_TTL) {
    return cached.data;
  }

  const where: any = {};
  if (filter?.staffId && filter.staffId !== 'all') {
    where.staffId = filter.staffId;
  }
  if (filter?.type && filter.type !== 'all') {
    where.type = filter.type;
  }

  const list = await prisma.feedback.findMany({
    where,
    select: {
      id: true,
      staffId: true,
      managerId: true,
      type: true,
      audience: true,
      subject: true,
      message: true,
      period: true,
      periodLabel: true,
      kpiId: true,
      emailStatus: true,
      emailDeliveredAt: true,
      emailError: true,
      batchId: true,
      readAt: true,
      createdAt: true,
      staff: { select: { fullName: true, employeeId: true, positionTitle: true, email: true } },
      manager: { select: { fullName: true, email: true } },
      kpi: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = list.map((f: any) => ({
    id: f.id,
    staffId: f.staffId,
    staffName: f.staff.fullName,
    employeeId: f.staff.employeeId,
    position: f.staff.positionTitle,
    recipientEmail: f.staff.email,
    managerId: f.managerId,
    managerName: f.manager.fullName,
    type: f.type || 'feedback',
    audience: f.audience || 'recipient_only',
    subject: f.subject,
    message: f.message,
    period: f.period,
    periodLabel: f.periodLabel,
    kpiId: f.kpiId,
    kpiName: f.kpi?.name ?? null,
    emailStatus: f.emailStatus || 'queued',
    emailDeliveredAt: f.emailDeliveredAt ? f.emailDeliveredAt.toISOString() : null,
    emailError: f.emailError,
    batchId: f.batchId,
    readAt: f.readAt ? f.readAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
  }));

  feedbackCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export interface CreateCommunicationInput {
  staffId: string; // User ID or 'all'
  type?: CommunicationType;
  audience?: CommunicationAudience;
  subject: string;
  message: string;
  period?: string;
  periodLabel?: string;
  kpiId?: string;
}

export async function createFeedback(managerId: string, input: CreateCommunicationInput) {
  const type = (input.type || 'feedback') as CommunicationType;
  const audience = (input.audience || 'recipient_only') as CommunicationAudience;
  const subject = input.subject?.trim();
  const message = input.message?.trim();

  if (!subject) throw ApiError.badRequest('Subject is required.');
  if (!message) throw ApiError.badRequest('Message is required.');

  // Fetch manager details
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, fullName: true, email: true, branchName: true },
  });
  if (!manager) throw ApiError.unauthorized('Manager not authenticated.');

  // Determine recipients
  const isAll = input.staffId === 'all';
  let targetStaff: Array<{ id: string; fullName: string; email: string; employeeId: string | null; positionTitle: string }>;

  if (isAll) {
    targetStaff = await prisma.user.findMany({
      where: { role: 'staff', status: 'active' },
      select: { id: true, fullName: true, email: true, employeeId: true, positionTitle: true },
    });
    if (targetStaff.length === 0) {
      throw ApiError.badRequest('No active staff members found to receive communication.');
    }
  } else {
    const singleStaff = await prisma.user.findFirst({
      where: { id: input.staffId, role: 'staff', status: 'active' },
      select: { id: true, fullName: true, email: true, employeeId: true, positionTitle: true },
    });
    if (!singleStaff) {
      throw ApiError.badRequest('Select an active staff member.');
    }
    targetStaff = [singleStaff];
  }

  const batchId = isAll ? `batch_${randomUUID()}` : null;
  const createdItems: any[] = [];
  let emailSentCount = 0;
  let emailFailedCount = 0;

  for (const staff of targetStaff) {
    // 1. Persist feedback record
    const record = await prisma.feedback.create({
      data: {
        staffId: staff.id,
        managerId,
        type,
        audience,
        subject,
        message,
        period: input.period || null,
        periodLabel: input.periodLabel || null,
        kpiId: input.kpiId || null,
        batchId,
        emailStatus: 'queued',
      },
    });

    // 2. Persist in-app notification for recipient
    await prisma.notification.create({
      data: {
        userId: staff.id,
        title: `${type.toUpperCase()}: ${subject}`,
        message: message.length > 150 ? `${message.slice(0, 147)}...` : message,
        type,
        link: '/staff/feedback',
      },
    });

    // 3. Dispatch transactional email via Brevo
    const emailHtml = renderCommunicationEmail({
      recipientName: staff.fullName,
      senderName: manager.fullName,
      type,
      subject,
      message,
      periodLabel: input.periodLabel,
      branchName: manager.branchName,
    });

    const emailResult = await sendTransactionalEmailDetailed({
      to: staff.email,
      toName: staff.fullName,
      subject: `[Bank of Abyssinia] ${type.toUpperCase()}: ${subject}`,
      htmlContent: emailHtml,
      textContent: `${subject}\n\n${message}\n\nSender: ${manager.fullName} (${manager.branchName})`,
    });

    // 4. Update email status
    const emailStatus = emailResult.success ? 'sent' : 'failed';
    if (emailResult.success) {
      emailSentCount++;
    } else {
      emailFailedCount++;
    }

    const updated = await prisma.feedback.update({
      where: { id: record.id },
      data: {
        emailStatus,
        emailDeliveredAt: emailResult.success ? new Date() : null,
        emailError: emailResult.error || null,
      },
      include: {
        staff: { select: { fullName: true, employeeId: true, positionTitle: true, email: true } },
        manager: { select: { fullName: true, email: true } },
        kpi: { select: { name: true } },
      },
    });

    const dto = {
      id: updated.id,
      staffId: updated.staffId,
      staffName: updated.staff.fullName,
      employeeId: updated.staff.employeeId,
      position: updated.staff.positionTitle,
      recipientEmail: updated.staff.email,
      managerId: updated.managerId,
      managerName: updated.manager.fullName,
      type: updated.type,
      audience: updated.audience,
      subject: updated.subject,
      message: updated.message,
      period: updated.period,
      periodLabel: updated.periodLabel,
      kpiId: updated.kpiId,
      kpiName: updated.kpi?.name ?? null,
      emailStatus: updated.emailStatus,
      emailDeliveredAt: updated.emailDeliveredAt?.toISOString() ?? null,
      emailError: updated.emailError,
      batchId: updated.batchId,
      readAt: null,
      createdAt: updated.createdAt.toISOString(),
    };

    createdItems.push(dto);

    // Realtime in-app alert
    realtimeService.sendToUser(staff.id, 'feedback_created', dto);
    realtimeService.notifyCountInvalidated([staff.id]);
    invalidateFeedbackCache(staff.id);
  }

  // If audience includes manager and multiple staff were notified, or as an audit record
  if (audience === 'recipient_and_manager') {
    await prisma.notification.create({
      data: {
        userId: managerId,
        title: `Dispatched ${type.toUpperCase()}: ${subject}`,
        message: `Sent to ${isAll ? `all ${targetStaff.length} branch staff` : targetStaff[0].fullName}`,
        type,
        link: '/manager/feedback',
      },
    });
  }

  await recordAuditLog({
    action: 'CREATE_COMMUNICATION',
    actorId: managerId,
    details: `Dispatched ${type} "${subject}" to ${isAll ? `all staff (${targetStaff.length} recipients)` : targetStaff[0].fullName} (Email: ${emailSentCount} sent, ${emailFailedCount} failed)`,
  });

  invalidateFeedbackCache();

  return {
    success: true,
    count: targetStaff.length,
    emailSent: emailSentCount,
    emailFailed: emailFailedCount,
    items: createdItems,
  };
}

export async function retryFeedbackEmail(id: string, managerId: string) {
  const fb = await prisma.feedback.findUnique({
    where: { id },
    include: {
      staff: { select: { fullName: true, email: true, employeeId: true, positionTitle: true } },
      manager: { select: { fullName: true, branchName: true } },
    },
  });

  if (!fb) {
    throw ApiError.notFound('Communication record not found.');
  }

  const emailHtml = renderCommunicationEmail({
    recipientName: fb.staff.fullName,
    senderName: fb.manager.fullName,
    type: (fb.type || 'feedback') as CommunicationType,
    subject: fb.subject,
    message: fb.message,
    periodLabel: fb.periodLabel || undefined,
    branchName: fb.manager.branchName,
  });

  const emailResult = await sendTransactionalEmailDetailed({
    to: fb.staff.email,
    toName: fb.staff.fullName,
    subject: `[Bank of Abyssinia] ${(fb.type || 'feedback').toUpperCase()}: ${fb.subject}`,
    htmlContent: emailHtml,
    textContent: `${fb.subject}\n\n${fb.message}\n\nSender: ${fb.manager.fullName}`,
  });

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      emailStatus: emailResult.success ? 'sent' : 'failed',
      emailDeliveredAt: emailResult.success ? new Date() : null,
      emailError: emailResult.error || null,
    },
    include: {
      staff: { select: { fullName: true, employeeId: true, positionTitle: true, email: true } },
      manager: { select: { fullName: true, email: true } },
      kpi: { select: { name: true } },
    },
  });

  await recordAuditLog({
    action: 'RETRY_FEEDBACK_EMAIL',
    actorId: managerId,
    details: `Retried email for communication "${fb.subject}" to ${fb.staff.fullName} -> Status: ${updated.emailStatus}`,
  });

  invalidateFeedbackCache(fb.staffId);

  return {
    id: updated.id,
    staffId: updated.staffId,
    staffName: updated.staff.fullName,
    employeeId: updated.staff.employeeId,
    position: updated.staff.positionTitle,
    recipientEmail: updated.staff.email,
    managerId: updated.managerId,
    managerName: updated.manager.fullName,
    type: updated.type,
    audience: updated.audience,
    subject: updated.subject,
    message: updated.message,
    period: updated.period,
    periodLabel: updated.periodLabel,
    kpiId: updated.kpiId,
    kpiName: updated.kpi?.name ?? null,
    emailStatus: updated.emailStatus,
    emailDeliveredAt: updated.emailDeliveredAt?.toISOString() ?? null,
    emailError: updated.emailError,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function markFeedbackRead(id: string, userId: string) {
  const fb = await prisma.feedback.findUnique({ where: { id } });
  if (!fb) {
    throw ApiError.notFound('Communication record not found.');
  }

  if (fb.staffId !== userId) {
    throw ApiError.forbidden('Only designated recipient can mark communication as read.');
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
    type: updated.type,
    audience: updated.audience,
    subject: updated.subject,
    message: updated.message,
    period: updated.period,
    periodLabel: updated.periodLabel,
    kpiId: updated.kpiId,
    kpiName: updated.kpi?.name ?? null,
    emailStatus: updated.emailStatus,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}
