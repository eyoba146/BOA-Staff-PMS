import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export interface RecordAuditParams {
  action: string;
  actorId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAudit({
  action,
  actorId,
  details,
  ipAddress,
}: RecordAuditParams): Promise<void> {
  try {
    // Sanitize details if sensitive
    const sanitizedDetails = details ? JSON.stringify(details) : undefined;
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
    // Audit logging should never crash the main transaction
    logger.warn('Failed to record audit log', { action, error: String(err) });
  }
}
