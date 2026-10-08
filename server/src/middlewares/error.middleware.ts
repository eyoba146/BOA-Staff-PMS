import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // If headers were already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err as Error);
  }

  // 1. ApiError
  if (err instanceof ApiError) {
    res.status(err.status).json({
      status: err.status,
      code: err.code,
      message: err.message,
      fieldErrors: err.fieldErrors,
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.');
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    res.status(400).json({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Please correct the highlighted fields.',
      fieldErrors,
    });
    return;
  }

  // 3. Prisma Unique Constraint Violation
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
    const meta = (err as { meta?: { target?: string[] } }).meta;
    const target = meta?.target?.join(', ') || 'field';
    res.status(409).json({
      status: 409,
      code: 'CONFLICT',
      message: `A record with this ${target} already exists.`,
    });
    return;
  }

  // 4. Unexpected Internal Error
  logger.error('Unhandled internal server error', {
    url: req.url,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
    stack: env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected server error occurred. Please try again later.',
  });
}
