import { Job } from 'bull';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { publishToInstagram } from '../social-media/instagram/client';

export interface PostPublishingJobData {
  postId: string;
  userId: string;
}

export async function processPostPublishingJob(job: Job<PostPublishingJobData>): Promise<void> {
  const { postId, userId } = job.data;

  logger.info(`Starting post publishing for post ${postId}`, {
    jobId: job.id,
    userId,
  });

  try {
    // Fetch post with relations
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        video: true,
        account: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (!post.video) {
      throw new Error(`Post ${postId} has no associated video`);
    }

    if (!post.account) {
      throw new Error(`Post ${postId} has no associated account`);
    }

    // Update status to PUBLISHING
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' },
    });

    await job.progress(30);

    let platformPostId: string;
    let platformUrl: string;

    // Publish based on platform
    switch (post.platform) {
      case 'INSTAGRAM':
        const instagramResult = await publishToInstagram(post, post.video, post.account);
        platformPostId = instagramResult.id;
        platformUrl = instagramResult.permalink;
        break;

      case 'YOUTUBE':
        // TODO: Implement YouTube publishing
        throw new Error('YouTube publishing not yet implemented');

      case 'FACEBOOK':
        // TODO: Implement Facebook publishing
        throw new Error('Facebook publishing not yet implemented');

      default:
        throw new Error(`Unsupported platform: ${post.platform}`);
    }

    await job.progress(90);

    // Update post with platform details
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        platformPostId,
        platformUrl,
      },
    });

    logger.info(`Post ${postId} published successfully to ${post.platform}`, {
      jobId: job.id,
      platformPostId,
      platformUrl,
    });

    await job.progress(100);
  } catch (error) {
    logger.error(`Post publishing failed for post ${postId}:`, error);

    // Update post status to FAILED
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: {
          increment: 1,
        },
      },
    });

    throw error; // Re-throw to mark job as failed
  }
}
