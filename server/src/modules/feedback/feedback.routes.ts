import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as feedbackController from './feedback.controller.js';

export const feedbackRoutes = Router();

// /me must precede /:id to prevent routing collision
feedbackRoutes.get('/me', authenticate, feedbackController.listMine);

feedbackRoutes.get('/', authenticate, requireRole('manager'), feedbackController.list);
feedbackRoutes.post('/', authenticate, requireRole('manager'), feedbackController.create);
feedbackRoutes.patch('/:id/read', authenticate, feedbackController.markRead);
