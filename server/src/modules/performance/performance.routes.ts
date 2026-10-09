import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as performanceController from './performance.controller.js';

export const performanceRoutes = Router();

// Staff own summary & trend
performanceRoutes.get('/me', authenticate, performanceController.getMySummary);
performanceRoutes.get('/me/trend', authenticate, performanceController.getMyTrend);

// Branch overview (Manager only)
performanceRoutes.get('/branch', authenticate, requireRole('manager'), performanceController.getBranchOverview);

// Branch consolidated report (Manager only)
performanceRoutes.get('/report', authenticate, requireRole('manager'), performanceController.getReport);

// Individual staff summary & trend
performanceRoutes.get('/staff/:staffId', authenticate, performanceController.getStaffSummary);
performanceRoutes.get('/staff/:staffId/trend', authenticate, performanceController.getStaffTrend);
