import { Router } from 'express';
import { staffController } from './staff.controller.js';
import { requireAuth, requireManager } from '../../middlewares/auth.middleware.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import {
  approveStaffSchema,
  rejectStaffSchema,
  setStaffStatusSchema,
  updateProfileSchema,
} from './staff.validation.js';

export const staffRouter = Router();
export const staffRoutes = staffRouter;

// Staff self-service & directory (authenticated active users)
staffRouter.get('/directory', requireAuth, staffController.listDirectory);
staffRouter.patch('/me', requireAuth, validateBody(updateProfileSchema), staffController.updateMyProfile);

// Manager-only approvals and staff oversight
staffRouter.get('/pending', requireAuth, requireManager, staffController.listPending);
staffRouter.get('/', requireAuth, requireManager, staffController.list);
staffRouter.get('/:id', requireAuth, requireManager, staffController.getById);

staffRouter.post(
  '/:id/approve',
  requireAuth,
  requireManager,
  validateBody(approveStaffSchema),
  staffController.approve,
);

staffRouter.post(
  '/:id/reject',
  requireAuth,
  requireManager,
  validateBody(rejectStaffSchema),
  staffController.reject,
);

staffRouter.patch(
  '/:id/status',
  requireAuth,
  requireManager,
  validateBody(setStaffStatusSchema),
  staffController.setStatus,
);
