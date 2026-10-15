import type { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service.js';

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const data = await notificationService.listUserNotifications(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const updated = await notificationService.markNotificationRead(id, userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const result = await notificationService.markAllNotificationsRead(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
