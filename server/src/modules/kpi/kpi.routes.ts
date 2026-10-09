import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as kpiController from './kpi.controller.js';

export const kpiRoutes = Router();
export const kpiAssignmentRoutes = Router();

// /api/kpis/assigned/me must come BEFORE /:id to avoid router route clash
kpiRoutes.get('/assigned/me', authenticate, kpiController.getMyAssignedKpis);

kpiRoutes.get('/', authenticate, kpiController.list);
kpiRoutes.post('/', authenticate, requireRole('manager'), kpiController.create);

kpiRoutes.get('/:id', authenticate, kpiController.getById);
kpiRoutes.patch('/:id', authenticate, requireRole('manager'), kpiController.update);
kpiRoutes.patch('/:id/status', authenticate, requireRole('manager'), kpiController.setStatus);
kpiRoutes.put('/:id/assignments', authenticate, requireRole('manager'), kpiController.setAssignments);

// /api/kpi-assignments
kpiAssignmentRoutes.get('/', authenticate, kpiController.listAssignments);
