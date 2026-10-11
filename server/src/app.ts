import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { checkDatabaseConnection } from './config/database.js';
import { logger } from './utils/logger.js';
import { ApiError } from './utils/apiError.js';
import { runWithRequestContext } from './utils/request-context.js';

// Module routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { positionRoutes } from './modules/position/position.routes.js';
import { kpiRoutes, kpiAssignmentRoutes } from './modules/kpi/kpi.routes.js';
import { kpiEntryRoutes } from './modules/kpiEntry/kpiEntry.routes.js';
import { performanceRoutes } from './modules/performance/performance.routes.js';
import { feedbackRoutes } from './modules/feedback/feedback.routes.js';
import { announcementRoutes } from './modules/announcement/announcement.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { realtimeRoutes } from './modules/realtime/realtime.routes.js';

export const app = express();

// Trust reverse proxy (Render, Cloudflare, AWS ALB)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

// CORS configuration for React frontend
const allowedOrigins = new Set(
  env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, '')).filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or non-browser requests without origin header
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, '');
      if (
        allowedOrigins.has(normalized) ||
        /^https:\/\/boa-staff-[a-z0-9-]+\.vercel\.app$/.test(normalized) ||
        (env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(normalized))
      ) {
        return callback(null, true);
      }

      callback(null, false);
    },
    credentials: true,
  })
);

// Cookie & Body Parsers
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request diagnostics. Query strings and request bodies are intentionally excluded.
app.use((req, res, next) => {
  const requestId = randomUUID();
  const startedAt = performance.now();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    if (env.NODE_ENV !== 'development') return;
    logger.debug('API request completed', {
      requestId,
      method: req.method,
      route: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
  });

  runWithRequestContext({ requestId }, next);
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
app.use('/api/kpi-assignments', kpiAssignmentRoutes);
app.use('/api/kpi-entries', kpiEntryRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/realtime', realtimeRoutes);

// 404 Catch-All
app.use((req, res, next) => {
  next(ApiError.notFound(`Endpoint ${req.method} ${req.url} does not exist.`));
});

// Centralized Error Handling
app.use(errorHandler);
