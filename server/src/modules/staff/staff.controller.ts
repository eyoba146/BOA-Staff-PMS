import type { Request, Response, NextFunction } from 'express';
import { staffService } from './staff.service.js';
import { ApiError } from '../../utils/apiError.js';

import { isStaffInScope } from '../../utils/scope.js';

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
      const staffId = String(req.params.id);
      if (req.user?.role === 'customer_experience_manager') {
        const inScope = await isStaffInScope(req.user, staffId);
        if (!inScope) {
          throw ApiError.forbidden('You do not have permission to view staff outside your permitted scope.');
        }
      }
      const user = await staffService.getById(staffId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async listInScope(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id || req.user!.userId || '';
      const users = await staffService.listStaffInScope({ id: userId, role: req.user!.role });
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async listCem(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = await staffService.listCem();
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async assignCem(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = req.user!.userId || req.user!.id!;
      const staffId = String(req.params.id);
      const updated = await staffService.assignCem(staffId, managerId, req.body, req.ip);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async revokeCem(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = req.user!.userId || req.user!.id!;
      const staffId = String(req.params.id);
      const updated = await staffService.revokeCem(staffId, managerId, req.ip);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async updateCemScope(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = req.user!.userId || req.user!.id!;
      const staffId = String(req.params.id);
      const scope = await staffService.updateCemScope(staffId, managerId, req.body, req.ip);
      res.json(scope);
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

  async getNextEmployeeId(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = await staffService.getNextEmployeeId();
      res.json({ employeeId });
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

  async requestEmailChange(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const result = await staffService.requestEmailChange(req.user.userId, req.body, req.ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmailChange(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const updated = await staffService.verifyEmailChange(req.user.userId, req.body, req.ip);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await staffService.delete(String(req.params.id), req.user?.userId, req.ip);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async deleteMany(req: Request, res: Response, next: NextFunction) {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
      const result = await staffService.deleteMany(ids, req.user?.userId, req.ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
