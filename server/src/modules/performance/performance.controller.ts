import type { Request, Response, NextFunction } from 'express';
import * as performanceService from './performance.service.js';
import { todayISO, type PerformancePeriod } from '../../utils/date.js';
import { ApiError } from '../../utils/apiError.js';

export async function getMySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as PerformancePeriod) || 'daily';
    const date = (req.query.date as string) || todayISO();
    const userId = req.user!.userId || req.user!.id!;
    const summary = await performanceService.summarizeStaffPeriod(userId, period, date);
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
    const trend = await performanceService.trendForStaff([userId], period, date);
    res.json(trend);
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
