import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import {
  loginSchema,
  changePasswordSchema,
  registerSchema,
  verifyEmailSchema,
  resendEmailCodeSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resendResetCodeSchema,
  resetPasswordSchema,
} from './auth.validation.js';

export const authRoutes = Router();

// Public session and status endpoints
authRoutes.post('/login', validateBody(loginSchema), authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.post('/refresh', authController.refresh);
authRoutes.get('/registration-status', authController.getRegistrationStatus);

// Feature 2: Registration & email verification
authRoutes.post('/register', validateBody(registerSchema), authController.register);
authRoutes.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
authRoutes.post('/resend-email-code', validateBody(resendEmailCodeSchema), authController.resendEmailCode);

// Feature 1: Password reset multi-step recovery
authRoutes.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
authRoutes.post('/verify-reset-code', validateBody(verifyResetCodeSchema), authController.verifyResetCode);
authRoutes.post('/resend-reset-code', validateBody(resendResetCodeSchema), authController.resendResetCode);
authRoutes.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// Protected session endpoints
authRoutes.get('/me', requireAuth, authController.getMe);
authRoutes.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  authController.changePassword,
);
