import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export interface RecordAuditParams {
  action: string;
  actorId?: string;
  details?: string | Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAudit({
  action,
  actorId,
  details,
  ipAddress,
}: RecordAuditParams): Promise<void> {
  try {
    const sanitizedDetails = details
      ? typeof details === 'string'
        ? details
        : JSON.stringify(details)
      : undefined;
    if (prisma) {
      await prisma.auditLog.create({
        data: {
          action,
          actorId,
          details: sanitizedDetails,
          ipAddress,
        },
      });
    }
    logger.info(`Audit log: ${action}`, { actorId });
  } catch (err) {
    logger.warn('Failed to record audit log', { action, error: String(err) });
  }
}

export const recordAuditLog = recordAudit;
