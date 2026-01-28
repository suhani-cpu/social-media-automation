import { Job } from 'bull';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { processVideo } from '../video-processing/transcoder';

export interface VideoProcessingJobData {
  videoId: string;
  userId: string;
}

export async function processVideoJob(job: Job<VideoProcessingJobData>): Promise<void> {
  const { videoId, userId } = job.data;

  logger.info(`Starting video processing for video ${videoId}`, {
    jobId: job.id,
    userId,
  });

  try {
    // Update video status to PROCESSING
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });

    // Process video with progress reporting
    await processVideo({
      videoId,
      onProgress: async (stage, progress) => {
        await job.progress(progress);
        logger.debug(`Video processing progress: ${stage} - ${progress.toFixed(2)}%`, {
          videoId,
          jobId: job.id,
        });
      },
    });

    logger.info(`Video processing completed for video ${videoId}`, {
      jobId: job.id,
    });
  } catch (error) {
    logger.error(`Video processing failed for video ${videoId}:`, error);

    // Video status is already updated to FAILED in processVideo
    // Just re-throw to mark job as failed
    throw error;
  }
}
