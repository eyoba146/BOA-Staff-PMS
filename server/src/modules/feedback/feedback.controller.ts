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
    const { staffId, type, status } = req.query as { staffId?: string; type?: string; status?: string };
    const callerUser = req.user
      ? { id: req.user.id || req.user.userId || '', role: req.user.role }
      : undefined;
    const list = await feedbackService.listAllFeedback({ staffId, type, status }, callerUser);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { staffId, type, audience, subject, message, period, periodLabel, kpiId, suggestedAction, followUpDate } = req.body;
    if (!staffId || !subject || !message) {
      throw ApiError.badRequest('Recipient (staffId), subject, and message are required.');
    }
    const callerUser = { id: userId, role: req.user!.role };
    const created = await feedbackService.createFeedback(
      userId,
      {
        staffId,
        type,
        audience,
        subject,
        message,
        suggestedAction,
        followUpDate,
        period,
        periodLabel,
        kpiId,
      },
      callerUser,
    );
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function retryEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const updated = await feedbackService.retryFeedbackEmail(id, userId);
    res.json(updated);
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

export async function acknowledge(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const updated = await feedbackService.acknowledgeFeedback(id, userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function reply(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const { reply } = req.body;
    const updated = await feedbackService.replyFeedback(id, userId, reply);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
