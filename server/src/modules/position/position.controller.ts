import { Request, Response, NextFunction } from 'express';
import { positionService } from './position.service.js';

export const positionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const positions = await positionService.list({ activeOnly, search });
      res.json(positions);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await positionService.getById(String(req.params.id));
      res.json(position);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await positionService.create(req.body.name);
      res.status(201).json(position);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await positionService.update(String(req.params.id), req.body);
      res.json(position);
    } catch (err) {
      next(err);
    }
  },

  async setActive(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await positionService.setActive(String(req.params.id), req.body.isActive);
      res.json(position);
    } catch (err) {
      next(err);
    }
  },
};
