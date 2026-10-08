import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { checkDatabaseConnection } from './config/database.js';

const server = app.listen(env.PORT, async () => {
  logger.info(`BoA PMS Express API server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  logger.info(`CORS enabled for client origin: ${env.CLIENT_URL}`);

  const dbOk = await checkDatabaseConnection();
  if (dbOk) {
    logger.info('PostgreSQL database connection verified successfully.');
  } else {
    logger.warn('PostgreSQL connection check failed or DATABASE_URL not yet configured.');
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
