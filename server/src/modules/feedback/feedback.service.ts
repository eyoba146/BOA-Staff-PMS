import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { sendTransactionalEmailDetailed } from '../../config/brevo.js';
import { renderCommunicationEmail } from '../../utils/emailTemplates.js';
import { ApiError } from '../../utils/apiError.js';
import { recordAuditLog } from '../audit/audit.service.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { isStaffInScope, getStaffIdsInScope } from '../../utils/scope.js';

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
      suggestedAction: true,
      followUpDate: true,
      status: true,
      acknowledgedAt: true,
      staffReply: true,
      staffRepliedAt: true,
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
    suggestedAction: f.suggestedAction,
    followUpDate: f.followUpDate ? f.followUpDate.toISOString() : null,
    status: f.status || 'pending',
    acknowledgedAt: f.acknowledgedAt ? f.acknowledgedAt.toISOString() : null,
    staffReply: f.staffReply,
    staffRepliedAt: f.staffRepliedAt ? f.staffRepliedAt.toISOString() : null,
    emailStatus: f.emailStatus || 'queued',
    emailDeliveredAt: f.emailDeliveredAt ? f.emailDeliveredAt.toISOString() : null,
    readAt: f.readAt ? f.readAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
  }));

  feedbackCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function listAllFeedback(
  filter?: { staffId?: string; type?: string; status?: string },
  callerUser?: { id: string; role: string },
) {
  const cacheKey = `all_${callerUser?.id ?? ''}_${filter?.staffId ?? ''}_${filter?.type ?? ''}_${filter?.status ?? ''}`;
  const cached = feedbackCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEEDBACK_CACHE_TTL) {
    return cached.data;
  }

  const where: any = {};

  if (callerUser?.role === 'customer_experience_manager') {
    const scopeIds = await getStaffIdsInScope(callerUser);
    where.OR = [
      { staffId: { in: scopeIds } },
      { managerId: callerUser.id },
    ];
  }

  if (filter?.staffId && filter.staffId !== 'all') {
    where.staffId = filter.staffId;
  }
  if (filter?.type && filter.type !== 'all') {
    where.type = filter.type;
  }
  if (filter?.status && filter.status !== 'all') {
    where.status = filter.status;
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
      suggestedAction: true,
      followUpDate: true,
      status: true,
      acknowledgedAt: true,
      staffReply: true,
      staffRepliedAt: true,
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
    suggestedAction: f.suggestedAction,
    followUpDate: f.followUpDate ? f.followUpDate.toISOString() : null,
    status: f.status || 'pending',
    acknowledgedAt: f.acknowledgedAt ? f.acknowledgedAt.toISOString() : null,
    staffReply: f.staffReply,
    staffRepliedAt: f.staffRepliedAt ? f.staffRepliedAt.toISOString() : null,
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
  suggestedAction?: string;
  followUpDate?: string;
  period?: string;
  periodLabel?: string;
  kpiId?: string;
}

export async function createFeedback(
  managerId: string,
  input: CreateCommunicationInput,
  callerUser?: { id: string; role: string },
) {
  const type = (input.type || 'feedback') as CommunicationType;
  const audience = (input.audience || 'recipient_only') as CommunicationAudience;
  const subject = input.subject?.trim();
  const message = input.message?.trim();
  const isAll = input.staffId === 'all';

  if (!subject) throw ApiError.badRequest('Subject is required.');
  if (!message) throw ApiError.badRequest('Message is required.');

  // Fetch manager details
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, fullName: true, email: true, branchName: true },
  });
  if (!manager) throw ApiError.unauthorized('Manager not authenticated.');

  // Verify scope if caller is Customer Experience Manager
  if (callerUser?.role === 'customer_experience_manager') {
    if (isAll) {
      const scope = await prisma.managerScope.findUnique({ where: { userId: managerId } });
      if (scope && scope.scopeType !== 'branch') {
        throw ApiError.forbidden('Your Customer Experience Manager scope does not permit broadcasting to all branch staff.');
      }
    } else {
      const inScope = await isStaffInScope(callerUser, input.staffId);
      if (!inScope) {
        throw ApiError.forbidden('You do not have permission to give feedback to staff outside your permitted scope.');
      }
    }
  }

  // Determine recipients
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
      where: { id: input.staffId, role: { in: ['staff', 'customer_experience_manager'] }, status: 'active' },
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
        suggestedAction: input.suggestedAction?.trim() || null,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        status: 'pending',
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
      suggestedAction: updated.suggestedAction,
      followUpDate: updated.followUpDate ? updated.followUpDate.toISOString().slice(0, 10) : null,
      status: updated.status,
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      staffReply: updated.staffReply,
      staffRepliedAt: updated.staffRepliedAt?.toISOString() ?? null,
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
    suggestedAction: updated.suggestedAction,
    followUpDate: updated.followUpDate ? updated.followUpDate.toISOString() : null,
    status: updated.status,
    acknowledgedAt: updated.acknowledgedAt ? updated.acknowledgedAt.toISOString() : null,
    staffReply: updated.staffReply,
    staffRepliedAt: updated.staffRepliedAt ? updated.staffRepliedAt.toISOString() : null,
    period: updated.period,
    periodLabel: updated.periodLabel,
    kpiId: updated.kpiId,
    kpiName: updated.kpi?.name ?? null,
    emailStatus: updated.emailStatus,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function acknowledgeFeedback(feedbackId: string, staffId: string) {
  const fb = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: {
      manager: { select: { id: true, fullName: true } },
      staff: { select: { fullName: true } },
    },
  });
  if (!fb) throw ApiError.notFound('Feedback not found.');
  if (fb.staffId !== staffId) throw ApiError.forbidden('You can only acknowledge feedback addressed to you.');

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      readAt: fb.readAt || new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: fb.managerId,
      title: 'Feedback Acknowledged',
      message: `${fb.staff.fullName} acknowledged your coaching feedback: "${fb.subject}".`,
      type: 'success',
      link: '/manager/feedback',
    },
  }).catch(() => {});

  await recordAuditLog({
    action: 'FEEDBACK_ACKNOWLEDGED',
    actorId: staffId,
    details: { feedbackId, subject: fb.subject },
  });

  invalidateFeedbackCache(staffId);
  return updated;
}

export async function replyFeedback(feedbackId: string, staffId: string, reply: string) {
  if (!reply?.trim()) throw ApiError.badRequest('Reply text is required.');
  const fb = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: {
      manager: { select: { id: true, fullName: true } },
      staff: { select: { fullName: true } },
    },
  });
  if (!fb) throw ApiError.notFound('Feedback not found.');
  if (fb.staffId !== staffId) throw ApiError.forbidden('You can only reply to feedback addressed to you.');

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      staffReply: reply.trim(),
      staffRepliedAt: new Date(),
      status: 'in_progress',
      readAt: fb.readAt || new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: fb.managerId,
      title: 'Staff Replied to Feedback',
      message: `${fb.staff.fullName} replied to "${fb.subject}": ${reply.trim().slice(0, 100)}`,
      type: 'info',
      link: '/manager/feedback',
    },
  }).catch(() => {});

  await recordAuditLog({
    action: 'FEEDBACK_REPLIED',
    actorId: staffId,
    details: { feedbackId, subject: fb.subject, reply: reply.trim() },
  });

  invalidateFeedbackCache(staffId);
  return updated;
}
