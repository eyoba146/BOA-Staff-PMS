import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { checkDatabaseConnection } from './config/database.js';
import { logger } from './utils/logger.js';
import { ApiError } from './utils/apiError.js';

// Module routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { positionRoutes } from './modules/position/position.routes.js';
import { kpiRoutes } from './modules/kpi/kpi.routes.js';
import { kpiEntryRoutes } from './modules/kpiEntry/kpiEntry.routes.js';
import { performanceRoutes } from './modules/performance/performance.routes.js';
import { feedbackRoutes } from './modules/feedback/feedback.routes.js';
import { announcementRoutes } from './modules/announcement/announcement.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';

export const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration for React frontend
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Cookie & Body Parsers
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected (or awaiting connection string)',
    environment: env.NODE_ENV,
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/kpi-entries', kpiEntryRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Catch-All
app.use((req, res, next) => {
  next(ApiError.notFound(`Endpoint ${req.method} ${req.url} does not exist.`));
});

// Centralized Error Handling
app.use(errorHandler);
