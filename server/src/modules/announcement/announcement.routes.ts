import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as announcementController from './announcement.controller.js';

export const announcementRoutes = Router();

announcementRoutes.get('/', authenticate, announcementController.list);
announcementRoutes.post('/', authenticate, requireRole('manager'), announcementController.create);

announcementRoutes.patch('/:id', authenticate, requireRole('manager'), announcementController.update);
announcementRoutes.post('/:id/archive', authenticate, requireRole('manager'), announcementController.archive);
announcementRoutes.post('/:id/read', authenticate, announcementController.markRead);
