import { Router } from 'express';
import { staffController } from './staff.controller.js';
import { requireAuth, requireManager, requireManagerOrCem } from '../../middlewares/auth.middleware.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import {
  approveStaffSchema,
  rejectStaffSchema,
  setStaffStatusSchema,
  updateProfileSchema,
  staffEmailChangeRequestSchema,
  staffEmailChangeVerifySchema,
} from './staff.validation.js';

export const staffRouter = Router();
export const staffRoutes = staffRouter;

// Staff self-service & directory (authenticated active users)
staffRouter.get('/directory', requireAuth, staffController.listDirectory);
staffRouter.patch('/me', requireAuth, validateBody(updateProfileSchema), staffController.updateMyProfile);

// Staff email change workflow with Brevo OTP verification
staffRouter.post(
  '/email/request',
  requireAuth,
  validateBody(staffEmailChangeRequestSchema),
  staffController.requestEmailChange,
);

staffRouter.post(
  '/email/verify',
  requireAuth,
  validateBody(staffEmailChangeVerifySchema),
  staffController.verifyEmailChange,
);

// Customer Experience Manager scope listing & role management
staffRouter.get('/cem', requireAuth, requireManager, staffController.listCem);
staffRouter.get('/in-scope', requireAuth, requireManagerOrCem, staffController.listInScope);

// Manager-only approvals and staff oversight
staffRouter.get('/pending', requireAuth, requireManager, staffController.listPending);
staffRouter.get('/next-employee-id', requireAuth, requireManager, staffController.getNextEmployeeId);
staffRouter.get('/', requireAuth, requireManager, staffController.list);
staffRouter.get('/:id', requireAuth, requireManagerOrCem, staffController.getById);

staffRouter.post('/:id/assign-cem', requireAuth, requireManager, staffController.assignCem);
staffRouter.post('/:id/revoke-cem', requireAuth, requireManager, staffController.revokeCem);
staffRouter.patch('/:id/cem-scope', requireAuth, requireManager, staffController.updateCemScope);

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

staffRouter.delete(
  '/:id',
  requireAuth,
  requireManager,
  staffController.delete,
);
