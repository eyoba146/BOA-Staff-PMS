import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { realtimeController } from './realtime.controller.js';

export const realtimeRoutes = Router();

realtimeRoutes.get('/stream', authenticate, realtimeController.stream);
