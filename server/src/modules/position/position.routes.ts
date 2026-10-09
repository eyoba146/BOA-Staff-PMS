import { Router } from 'express';
import { positionController } from './position.controller.js';
import { requireAuth, requireManager } from '../../middlewares/auth.middleware.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import {
  createPositionSchema,
  updatePositionSchema,
  setPositionStatusSchema,
} from './position.validation.js';

export const positionRouter = Router();
export const positionRoutes = positionRouter;

// Publicly accessible for registration dropdown; can also be filtered by activeOnly
positionRouter.get('/', positionController.list);
positionRouter.get('/:id', requireAuth, positionController.getById);

// Manager-only administration
positionRouter.post(
  '/',
  requireAuth,
  requireManager,
  validateBody(createPositionSchema),
  positionController.create,
);

positionRouter.patch(
  '/:id',
  requireAuth,
  requireManager,
  validateBody(updatePositionSchema),
  positionController.update,
);

positionRouter.patch(
  '/:id/status',
  requireAuth,
  requireManager,
  validateBody(setPositionStatusSchema),
  positionController.setActive,
);
