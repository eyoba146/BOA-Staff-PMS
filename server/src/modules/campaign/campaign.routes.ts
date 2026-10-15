import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as campaignController from './campaign.controller.js';

export const campaignRoutes = Router();

// Export route must precede /:id to avoid collision
campaignRoutes.get('/export', authenticate, requireRole('manager'), campaignController.exportCsv);
campaignRoutes.get('/types', authenticate, campaignController.getTypes);

// List campaigns (manager and authorized staff can view campaigns)
campaignRoutes.get('/', authenticate, campaignController.list);

// Manager-only CRUD operations
campaignRoutes.post('/', authenticate, requireRole('manager'), campaignController.create);
campaignRoutes.put('/:id', authenticate, requireRole('manager'), campaignController.update);
campaignRoutes.delete('/:id', authenticate, requireRole('manager'), campaignController.remove);
