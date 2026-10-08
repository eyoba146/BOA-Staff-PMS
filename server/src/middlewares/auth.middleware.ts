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

  req.user = payload;
  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'manager') {
      throw ApiError.forbidden('Branch Manager authorization required for this operation.');
    }
    next();
  });
}

export function requireActive(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.status !== 'active') {
      throw ApiError.forbidden('Your account is not active.');
    }
    next();
  });
}
