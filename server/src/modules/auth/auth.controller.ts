import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { ApiError } from '../../utils/apiError.js';
import { env } from '../../config/env.js';

const COOKIE_NAME = 'refreshToken';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password, remember } = req.body;
      const result = await authService.login(identifier, password, req.ip);

      const maxAge = remember
        ? 30 * 24 * 60 * 60 * 1000 // 30 days if remember
        : 7 * 24 * 60 * 60 * 1000;  // 7 days default

      res.cookie(COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });

      res.status(200).json({
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies[COOKIE_NAME];
      if (!token) {
        throw ApiError.unauthorized('No refresh token provided in session cookies.');
      }

      const result = await authService.refresh(token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const user = await authService.getMe(req.user.userId);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },

  async getRegistrationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier =
        (req.query.employeeId as string) ||
        (req.query.identifier as string) ||
        '';

      if (!identifier.trim()) {
        throw ApiError.badRequest('Identifier or employeeId query parameter is required.');
      }

      const result = await authService.getRegistrationStatus(identifier);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.userId, currentPassword, newPassword, req.ip);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // ---------------- FEATURE 2: Registration & Verification ----------------
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, req.ip);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyEmail(req.body, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async resendEmailCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resendEmailCode(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- FEATURE 1: Password Recovery ----------------
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestPasswordReset(req.body.identifier);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyResetCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyResetCode(req.body.identifier, req.body.code);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async resendResetCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resendResetCode(req.body.identifier);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(
        req.body.identifier,
        req.body.resetToken,
        req.body.newPassword,
        req.ip,
      );
      res.status(200).json({ success: true, message: 'Password has been successfully reset.' });
    } catch (err) {
      next(err);
    }
  },
};
