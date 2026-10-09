import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as kpiEntryController from './kpiEntry.controller.js';

export const kpiEntryRoutes = Router();

kpiEntryRoutes.get('/me', authenticate, kpiEntryController.listMine);
kpiEntryRoutes.get('/', authenticate, kpiEntryController.listForStaff);
kpiEntryRoutes.post('/', authenticate, kpiEntryController.submit);
