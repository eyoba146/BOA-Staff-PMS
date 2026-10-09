import type { Request, Response, NextFunction } from 'express';
import * as kpiEntryService from './kpiEntry.service.js';
import { ApiError } from '../../utils/apiError.js';

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { from, to, kpiId } = req.query as { from?: string; to?: string; kpiId?: string };
    const entries = await kpiEntryService.listEntries({
      staffId: userId,
      from,
      to,
      kpiId,
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

export async function listForStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { staffId, from, to, kpiId } = req.query as { staffId?: string; from?: string; to?: string; kpiId?: string };
    if (!staffId) {
      throw ApiError.badRequest('staffId parameter is required.');
    }
    // Only managers or the staff member themselves can view
    if (req.user!.role !== 'manager' && userId !== staffId) {
      throw ApiError.forbidden('You do not have permission to view performance records for another staff member.');
    }
    const entries = await kpiEntryService.listEntries({
      staffId,
      from,
      to,
      kpiId,
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { date, entries } = req.body;
    if (!date || !Array.isArray(entries)) {
      throw ApiError.badRequest('Submission must contain date and entries array.');
    }
    const result = await kpiEntryService.submitEntries(userId, date, entries);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
