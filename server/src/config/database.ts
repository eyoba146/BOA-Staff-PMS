
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let prismaInstance: PrismaClient | null = null;

if (env.DATABASE_URL) {
  try {
    if (env.NODE_ENV === 'development') {
      prismaInstance = new PrismaClient({ log: ['warn', 'error'] });
    } else {
      // Preserve production logging behavior.
      prismaInstance = new PrismaClient({
        log: ['error'],
      });
    }
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
    return true;
  } catch (err) {
    logger.error('Database connection check failed', {
      error: err instanceof Error ? err.name : 'unknown',
    });
    return false;
  }
}
