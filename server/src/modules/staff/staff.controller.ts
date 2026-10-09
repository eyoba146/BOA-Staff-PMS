import type { Request, Response, NextFunction } from 'express';
import { staffService } from './staff.service.js';
import { ApiError } from '../../utils/apiError.js';

export const staffController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const users = await staffService.list({ status, search });
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await staffService.getById(String(req.params.id));
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const pending = await staffService.listPending();
      res.json(pending);
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const approved = await staffService.approve(
        String(req.params.id),
        req.body,
        req.user?.userId,
        req.ip,
      );
      res.json(approved);
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const rejected = await staffService.reject(
        String(req.params.id),
        req.body.reason,
        req.user?.userId,
        req.ip,
      );
      res.json(rejected);
    } catch (err) {
      next(err);
    }
  },

  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await staffService.setStatus(
        String(req.params.id),
        req.body.status,
        req.user?.userId,
        req.ip,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const updated = await staffService.updateMyProfile(req.user.userId, req.body, req.ip);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async listDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const directory = await staffService.listDirectory();
      res.json(directory);
    } catch (err) {
      next(err);
    }
  },
};
