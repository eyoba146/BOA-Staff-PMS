import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as settingsController from './settings.controller.js';

export const settingsRoutes = Router();

settingsRoutes.get('/public', settingsController.getPublic);
settingsRoutes.get('/', authenticate, settingsController.get);
settingsRoutes.patch('/', authenticate, requireRole('manager'), settingsController.update);
settingsRoutes.patch('/manager-profile', authenticate, requireRole('manager'), settingsController.updateProfile);
settingsRoutes.post('/manager-email/request', authenticate, requireRole('manager'), settingsController.requestEmailChange);
settingsRoutes.post('/manager-email/verify', authenticate, requireRole('manager'), settingsController.verifyEmailChange);
