import '../config/env'; // Load environment variables first
import { videoProcessingQueue, postPublishingQueue, analyticsSyncQueue } from '../config/queue';
import { processVideoJob } from '../services/queue/video-processing.processor';
import { processPostPublishingJob } from '../services/queue/post-publishing.processor';
import { processAnalyticsSyncJob } from '../services/queue/analytics-sync.processor';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

// Concurrency settings
const CONCURRENCY = {
  VIDEO_PROCESSING: 2, // Process 2 videos at a time (CPU intensive)
  POST_PUBLISHING: 5, // Publish 5 posts concurrently (I/O bound)
  ANALYTICS_SYNC: 10, // Sync 10 analytics concurrently (I/O bound)
};

async function startWorker() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Register processors
    videoProcessingQueue.process(CONCURRENCY.VIDEO_PROCESSING, processVideoJob);
    logger.info(`📹 Video processing worker registered (concurrency: ${CONCURRENCY.VIDEO_PROCESSING})`);

    postPublishingQueue.process(CONCURRENCY.POST_PUBLISHING, processPostPublishingJob);
    logger.info(`📤 Post publishing worker registered (concurrency: ${CONCURRENCY.POST_PUBLISHING})`);

    analyticsSyncQueue.process(CONCURRENCY.ANALYTICS_SYNC, processAnalyticsSyncJob);
    logger.info(`📊 Analytics sync worker registered (concurrency: ${CONCURRENCY.ANALYTICS_SYNC})`);

    logger.info('🚀 Worker started - processing jobs from all queues');

    // Log queue stats periodically
    setInterval(async () => {
      try {
        const videoStats = {
          waiting: await videoProcessingQueue.getWaitingCount(),
          active: await videoProcessingQueue.getActiveCount(),
          failed: await videoProcessingQueue.getFailedCount(),
        };

        const postStats = {
          waiting: await postPublishingQueue.getWaitingCount(),
          active: await postPublishingQueue.getActiveCount(),
          failed: await postPublishingQueue.getFailedCount(),
        };

        const analyticsStats = {
          waiting: await analyticsSyncQueue.getWaitingCount(),
          active: await analyticsSyncQueue.getActiveCount(),
          failed: await analyticsSyncQueue.getFailedCount(),
        };

        logger.info('📊 Queue Stats', {
          video: videoStats,
          post: postStats,
          analytics: analyticsStats,
        });
      } catch (error) {
        logger.error('Failed to get queue stats:', error);
      }
    }, 60000); // Every minute
  } catch (error) {
    logger.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('🛑 Shutting down worker gracefully...');

  try {
    // Close queues (will wait for active jobs to complete)
    await Promise.all([
      videoProcessingQueue.close(),
      postPublishingQueue.close(),
      analyticsSyncQueue.close(),
    ]);

    // Disconnect from database
    await prisma.$disconnect();

    logger.info('✅ Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the worker
startWorker();
