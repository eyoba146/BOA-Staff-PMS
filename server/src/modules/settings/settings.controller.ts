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

export async function getPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const s = await settingsService.getPublicSettings();
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

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const updated = await settingsService.updateManagerProfile(userId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function requestEmailChange(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const result = await settingsService.requestManagerEmailChange(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailChange(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const result = await settingsService.verifyManagerEmailChange(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
