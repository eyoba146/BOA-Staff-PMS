import type { Request, Response, NextFunction } from 'express';
import * as performanceService from './performance.service.js';
import { todayISO, type PerformancePeriod } from '../../utils/date.js';
import { ApiError } from '../../utils/apiError.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getRequestId } from '../../utils/request-context.js';

async function runPerformanceService<T>(operation: string, run: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await run();
    if (env.NODE_ENV === 'development') {
      logger.debug('Performance service completed', {
        requestId: getRequestId(),
        operation,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
    }
    return result;
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      logger.debug('Performance service failed', {
        requestId: getRequestId(),
        operation,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        error: error instanceof Error ? error.name : 'unknown',
      });
    }
    throw error;
  }
}

export async function getMySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const userId = req.user!.userId || req.user!.id!;
    const summary = await runPerformanceService('summary', () => performanceService.summarizeStaffPeriod(userId, period, date));
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function getMyTrend(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const userId = req.user!.userId || req.user!.id!;
    const trend = await runPerformanceService('trend', () => performanceService.trendForStaff([userId], period, date));
    res.json(trend);
  } catch (err) {
    next(err);
  }
}

export async function getMyDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const userId = req.user!.userId || req.user!.id!;
    const dashboard = await runPerformanceService(
      'dashboard',
      () => performanceService.dashboardForStaff(userId, period, date),
    );
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getStaffSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const staffId = req.params.staffId as string;
    if (req.user!.role !== 'manager' && req.user!.id !== staffId) {
      throw ApiError.forbidden('You do not have permission to view performance summary for this staff member.');
    }
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const summary = await performanceService.summarizeStaffPeriod(staffId, period, date);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function getStaffTrend(req: Request, res: Response, next: NextFunction) {
  try {
    const staffId = req.params.staffId as string;
    if (req.user!.role !== 'manager' && req.user!.id !== staffId) {
      throw ApiError.forbidden('You do not have permission to view trend data for this staff member.');
    }
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const trend = await performanceService.trendForStaff([staffId], period, date);
    res.json(trend);
  } catch (err) {
    next(err);
  }
}

export async function getStaffDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const staffId = req.params.staffId as string;
    if (req.user!.role !== 'manager' && req.user!.id !== staffId) {
      throw ApiError.forbidden('You do not have permission to view performance data for this staff member.');
    }
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const dashboard = await runPerformanceService(
      'dashboard',
      () => performanceService.dashboardForStaff(staffId, period, date),
    );
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getBranchOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const overview = await performanceService.getBranchOverview(period, date);
    res.json(overview);
  } catch (err) {
    next(err);
  }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as PerformancePeriod) || 'monthly';
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      throw ApiError.badRequest('Both "from" and "to" parameters are required.');
    }
    const report = await performanceService.getPerformanceReport(period, from, to);
    res.json(report);
  } catch (err) {
    next(err);
  }
}
