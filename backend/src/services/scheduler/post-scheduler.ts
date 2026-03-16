import { prisma } from '../../config/database';
import { postPublishingQueue } from '../../config/queue';
import { logger } from '../../utils/logger';

/**
 * Check for scheduled posts and queue them for publishing
 */
export async function checkAndPublishScheduledPosts(): Promise<void> {
  const now = new Date();

  try {
    // Find posts scheduled for publishing
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
            status: true,
          },
        },
      },
    });

    if (scheduledPosts.length === 0) {
      logger.debug('No scheduled posts found');
      return;
    }

    logger.info(`Found ${scheduledPosts.length} posts to publish`);

    let successCount = 0;
    let errorCount = 0;

    // Queue publishing jobs for each post
    for (const post of scheduledPosts) {
      try {
        // Validate video is ready
        if (!post.video || post.video.status !== 'READY') {
          logger.warn(`Post ${post.id} video not ready`, {
            postId: post.id,
            videoStatus: post.video?.status,
          });

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'FAILED',
              errorMessage: `Video not ready for publishing. Video status: ${post.video?.status || 'null'}`,
            },
          });

          errorCount++;
          continue;
        }

        // Validate account is active
        if (post.account.status !== 'ACTIVE') {
          logger.warn(`Post ${post.id} account not active`, {
            postId: post.id,
            accountStatus: post.account.status,
          });

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'FAILED',
              errorMessage: `Account not active. Account status: ${post.account.status}`,
            },
          });

          errorCount++;
          continue;
        }

        // Update status to prevent duplicate processing
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHING' },
        });

        // Add to publishing queue
        await postPublishingQueue.add(
          {
            postId: post.id,
            userId: post.userId,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
          }
        );

        logger.info(`Queued post ${post.id} for publishing`, {
          postId: post.id,
          platform: post.account.platform,
          scheduledFor: post.scheduledFor,
        });

        successCount++;
      } catch (error) {
        logger.error(`Failed to queue post ${post.id}:`, {
          postId: post.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        errorCount++;
      }
    }

    logger.info('Scheduled post check completed', {
      total: scheduledPosts.length,
      queued: successCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('Scheduler error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * Get scheduled posts summary
 */
export async function getScheduledPostsSummary(): Promise<{
  upcoming: number;
  today: number;
  thisWeek: number;
}> {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  try {
    const [upcoming, today, thisWeek] = await Promise.all([
      prisma.post.count({
        where: {
          status: 'SCHEDULED',
          scheduledFor: { gte: now },
        },
      }),
      prisma.post.count({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            gte: now,
            lte: todayEnd,
          },
        },
      }),
      prisma.post.count({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            gte: now,
            lte: weekEnd,
          },
        },
      }),
    ]);

    return { upcoming, today, thisWeek };
  } catch (error) {
    logger.error('Failed to get scheduled posts summary:', error);
    throw error;
  }
}

/**
 * Reschedule a post
 */
export async function reschedulePost(
  postId: string,
  newScheduledFor: Date
): Promise<void> {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        scheduledFor: newScheduledFor,
        status: 'SCHEDULED',
      },
    });

    logger.info('Post rescheduled', {
      postId,
      newScheduledFor,
    });
  } catch (error) {
    logger.error('Failed to reschedule post:', {
      postId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
