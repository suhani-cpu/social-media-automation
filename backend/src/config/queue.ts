import Bull from 'bull';
import { config } from './env';
import { logger } from '../utils/logger';

// Queue names
export const QUEUE_NAMES = {
  VIDEO_PROCESSING: 'video-processing',
  POST_PUBLISHING: 'post-publishing',
  ANALYTICS_SYNC: 'analytics-sync',
} as const;

// Default job options
const defaultJobOptions: Bull.JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5 seconds, then 25s, then 125s
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: false, // Keep failed jobs for debugging
};

// Create queue instances
export const videoProcessingQueue = new Bull(QUEUE_NAMES.VIDEO_PROCESSING, config.REDIS_URL, {
  defaultJobOptions,
  settings: {
    lockDuration: 300000, // 5 minutes lock for video processing
    maxStalledCount: 1, // Retry stalled jobs once
  },
});

export const postPublishingQueue = new Bull(QUEUE_NAMES.POST_PUBLISHING, config.REDIS_URL, {
  defaultJobOptions,
  settings: {
    lockDuration: 60000, // 1 minute lock for publishing
    maxStalledCount: 2,
  },
});

export const analyticsSyncQueue = new Bull(QUEUE_NAMES.ANALYTICS_SYNC, config.REDIS_URL, {
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2, // Analytics sync can fail more gracefully
  },
  settings: {
    lockDuration: 30000, // 30 seconds lock for analytics
    maxStalledCount: 1,
  },
});

// Global error handlers
const setupErrorHandlers = (queue: Bull.Queue, name: string) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${name} error:`, error);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} in queue ${name} failed:`, {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      error: err.message,
      stack: err.stack,
      data: job.data,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} in queue ${name} stalled`, {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} in queue ${name} completed`, {
      jobId: job.id,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      duration: job.finishedOn! - job.processedOn!,
    });
  });
};

// Setup error handlers for all queues
setupErrorHandlers(videoProcessingQueue, QUEUE_NAMES.VIDEO_PROCESSING);
setupErrorHandlers(postPublishingQueue, QUEUE_NAMES.POST_PUBLISHING);
setupErrorHandlers(analyticsSyncQueue, QUEUE_NAMES.ANALYTICS_SYNC);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Closing queue connections...');

  await Promise.all([
    videoProcessingQueue.close(),
    postPublishingQueue.close(),
    analyticsSyncQueue.close(),
  ]);

  logger.info('All queue connections closed');
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Health check function
export const checkQueuesHealth = async () => {
  const queues = [
    { name: QUEUE_NAMES.VIDEO_PROCESSING, queue: videoProcessingQueue },
    { name: QUEUE_NAMES.POST_PUBLISHING, queue: postPublishingQueue },
    { name: QUEUE_NAMES.ANALYTICS_SYNC, queue: analyticsSyncQueue },
  ];

  const health = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return {
        name,
        waiting,
        active,
        completed,
        failed,
        healthy: active < 100 && failed < 50, // Arbitrary thresholds
      };
    })
  );

  return health;
};

logger.info('Queue system initialized');
