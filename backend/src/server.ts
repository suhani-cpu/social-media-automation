import { app } from './app';
import { config } from './config/env';
import { prisma } from './config/database';
import { logger } from './utils/logger';
import { initializeCronJobs, stopCronJobs } from './services/scheduler/cron-jobs';

const PORT = config.PORT;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Initialize cron jobs
    initializeCronJobs();
    logger.info('✅ Cron jobs initialized');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  stopCronJobs();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server...');
  stopCronJobs();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
