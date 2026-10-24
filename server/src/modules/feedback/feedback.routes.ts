import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as feedbackController from './feedback.controller.js';

export const feedbackRoutes = Router();

// /me must precede /:id to prevent routing collision
feedbackRoutes.get('/me', authenticate, feedbackController.listMine);

feedbackRoutes.get('/', authenticate, requireRole('manager', 'customer_experience_manager'), feedbackController.list);
feedbackRoutes.post('/', authenticate, requireRole('manager', 'customer_experience_manager'), feedbackController.create);
feedbackRoutes.post('/:id/retry-email', authenticate, requireRole('manager'), feedbackController.retryEmail);
feedbackRoutes.patch('/:id/read', authenticate, feedbackController.markRead);
feedbackRoutes.post('/:id/acknowledge', authenticate, feedbackController.acknowledge);
feedbackRoutes.post('/:id/reply', authenticate, feedbackController.reply);
