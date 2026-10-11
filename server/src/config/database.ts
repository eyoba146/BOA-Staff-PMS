
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let prismaInstance: PrismaClient | null = null;

if (env.DATABASE_URL) {
  try {
    const basePrisma = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    prismaInstance = (basePrisma as any).$extends({
      query: {
        async $allOperations({ model, operation, args, query }: any) {
          try {
            return await query(args);
          } catch (err: any) {
            const msg = String(err?.message || '');
            const isConnIssue =
              msg.includes("Can't reach database server") ||
              msg.includes("Timed out fetching a new connection") ||
              err?.code === 'P1001' ||
              err?.code === 'P1002';

            if (isConnIssue) {
              logger.warn(`Retrying transient database connection error on ${model ?? 'raw'}.${operation}`);
              await new Promise((r) => setTimeout(r, 800));
              return await query(args);
            }
            throw err;
          }
        },
      },
    }) as any;
  } catch (err) {
    logger.warn('Failed to initialize PrismaClient', {
      error: err instanceof Error ? err.name : 'unknown',
    });
  }
}

export const prisma = prismaInstance as any;

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!prisma || !env.DATABASE_URL) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    // Pre-warm the pool and cache system settings on startup
    void prisma.systemSettings.findUnique({ where: { id: 'default' } }).catch(() => {});
    return true;
  } catch (err) {
    logger.error('Database connection check failed', {
      error: err instanceof Error ? err.name : 'unknown',
    });
    return false;
  }
}
