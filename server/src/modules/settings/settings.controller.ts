import type { Request, Response, NextFunction } from 'express';
import * as settingsService from './settings.service.js';

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const s = await settingsService.getSettings();
    res.json(s);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const updated = await settingsService.updateSettings(req.body, userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
