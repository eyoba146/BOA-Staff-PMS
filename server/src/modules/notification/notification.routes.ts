import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as notificationController from './notification.controller.js';

export const notificationRoutes = Router();

notificationRoutes.get('/me', authenticate, notificationController.listMine);
notificationRoutes.patch('/read-all', authenticate, notificationController.markAllRead);
notificationRoutes.patch('/:id/read', authenticate, notificationController.markRead);
