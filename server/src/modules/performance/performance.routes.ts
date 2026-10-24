import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as performanceController from './performance.controller.js';

export const performanceRoutes = Router();

// Staff own summary & trend
performanceRoutes.get('/me', authenticate, performanceController.getMySummary);
performanceRoutes.get('/me/trend', authenticate, performanceController.getMyTrend);
performanceRoutes.get('/me/dashboard', authenticate, performanceController.getMyDashboard);

// Branch overview (Manager and Customer Experience Manager)
performanceRoutes.get('/branch', authenticate, requireRole('manager', 'customer_experience_manager'), performanceController.getBranchOverview);

// Branch consolidated report (Manager and Customer Experience Manager)
performanceRoutes.get('/report', authenticate, requireRole('manager', 'customer_experience_manager'), performanceController.getReport);

// Individual staff summary & trend
performanceRoutes.get('/staff/:staffId', authenticate, performanceController.getStaffSummary);
performanceRoutes.get('/staff/:staffId/trend', authenticate, performanceController.getStaffTrend);
performanceRoutes.get('/staff/:staffId/dashboard', authenticate, performanceController.getStaffDashboard);
