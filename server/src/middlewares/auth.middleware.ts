import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Missing or invalid Bearer token.');
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired session token.');
  }

  req.user = {
    ...payload,
    id: payload.userId || payload.id,
  };
  next();
}

export const authenticate = requireAuth;

export function requireRole(role: 'staff' | 'manager') {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || req.user.role !== role) {
        throw ApiError.forbidden(`${role.charAt(0).toUpperCase() + role.slice(1)} authorization required for this operation.`);
      }
      next();
    });
  };
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  requireRole('manager')(req, res, next);
}

export function requireActive(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.status !== 'active') {
      throw ApiError.forbidden('Your account is not active.');
    }
    next();
  });
}
