import { Job } from 'bull';
import { logger } from '../../utils/logger';
import { syncPostAnalytics } from '../analytics/sync';

export interface AnalyticsSyncJobData {
  postId: string;
}

export async function processAnalyticsSyncJob(job: Job<AnalyticsSyncJobData>): Promise<void> {
  const { postId } = job.data;

  logger.info(`Starting analytics sync for post ${postId}`, {
    jobId: job.id,
  });

  try {
    await syncPostAnalytics(postId);

    logger.info(`Analytics sync completed for post ${postId}`, {
      jobId: job.id,
    });
  } catch (error) {
    logger.error(`Analytics sync job failed for post ${postId}:`, error);
    throw error;
  }
}
