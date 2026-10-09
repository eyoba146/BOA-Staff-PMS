import type { Request, Response, NextFunction } from 'express';
import * as announcementService from './announcement.service.js';
import { ApiError } from '../../utils/apiError.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { status } = req.query as { status?: string };
    const list = await announcementService.listAnnouncements(userId, req.user!.role, status);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id || req.user!.userId;
    const { title, body, category, pinned, publish } = req.body;
    if (!title || !body || !category) {
      throw ApiError.badRequest('Title, body, and category are required.');
    }
    const created = await announcementService.createAnnouncement(userId, {
      title,
      body,
      category,
      pinned,
      publish,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const updated = await announcementService.updateAnnouncement(id, userId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    const archived = await announcementService.archiveAnnouncement(id, userId);
    res.json(archived);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id || req.user!.userId;
    await announcementService.markAnnouncementRead(id, userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
