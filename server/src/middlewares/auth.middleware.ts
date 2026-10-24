import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { userRepository } from '../repositories/user.repository.js';

export type UserRole = 'staff' | 'manager' | 'customer_experience_manager';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication required. Missing or invalid Bearer token.');
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired session token.');
  }

  if (payload.status && payload.status !== 'active') {
    throw ApiError.forbidden('Your account is not active. Access denied.');
  }

  req.user = {
    ...payload,
    id: payload.userId || payload.id,
  };
  next();
}

export const authenticate = requireAuth;

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, async () => {
      try {
        if (!req.user || req.user.status !== 'active') {
          throw ApiError.forbidden('Your account is not active.');
        }

        const userId = req.user.id || req.user.userId || '';
        if (!userId) {
          throw ApiError.unauthorized('Invalid authentication credentials.');
        }

        // Live check from database for immediate role revocation guarantee
        const dbUser = await userRepository.findById(userId);
        if (!dbUser || dbUser.status !== 'active') {
          throw ApiError.forbidden('Your account is not active.');
        }

        const effectiveRole = dbUser.role as UserRole;
        req.user.role = effectiveRole;

        if (!roles.includes(effectiveRole)) {
          throw ApiError.forbidden('You do not have the required role for this operation.');
        }
        next();
      } catch (err) {
        next(err);
      }
    });
  };
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  requireRole('manager')(req, res, next);
}

export function requireManagerOrCem(req: Request, res: Response, next: NextFunction): void {
  requireRole('manager', 'customer_experience_manager')(req, res, next);
}

export function requireActive(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.status !== 'active') {
      throw ApiError.forbidden('Your account is not active.');
    }
    next();
  });
}
