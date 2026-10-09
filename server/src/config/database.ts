import { env } from './env.js';
import { logger } from '../utils/logger.js';

let prismaInstance: any = null;

if (env.DATABASE_URL) {
  try {
    // Dynamic import to prevent startup crash if prisma generate has not yet run
    const pkg = await import('@prisma/client');
    const PrismaClientClass = (pkg as any).PrismaClient || (pkg as any).default?.PrismaClient;
    if (PrismaClientClass) {
      prismaInstance = new PrismaClientClass({
        log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    }
  } catch (err) {
    logger.warn('Prisma client not yet generated; fallback active.', { error: String(err) });
  }
}

export const prisma = prismaInstance;

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!prisma || !env.DATABASE_URL) {
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error('Database connection check failed', { error: String(err) });
    return false;
  }
}
