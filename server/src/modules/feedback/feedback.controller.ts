import type { Request, Response, NextFunction } from 'express';
import * as feedbackService from './feedback.service.js';
import { ApiError } from '../../utils/apiError.js';

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const list = await feedbackService.listReceivedFeedback(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { staffId } = req.query as { staffId?: string };
    const list = await feedbackService.listAllFeedback({ staffId });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { staffId, subject, message, period, periodLabel, kpiId } = req.body;
    if (!staffId || !subject || !message) {
      throw ApiError.badRequest('staffId, subject, and message are required.');
    }
    const created = await feedbackService.createFeedback(userId, {
      staffId,
      subject,
      message,
      period,
      periodLabel,
      kpiId,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const updated = await feedbackService.markFeedbackRead(id, userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
