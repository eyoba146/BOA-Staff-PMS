import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import * as settingsController from './settings.controller.js';

export const settingsRoutes = Router();

settingsRoutes.get('/', authenticate, settingsController.get);
settingsRoutes.patch('/', authenticate, requireRole('manager'), settingsController.update);
