import cron from 'node-cron';
import { checkAndPublishScheduledPosts } from './post-scheduler';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';
import { analyticsSyncQueue } from '../../config/queue';

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(): void {
  logger.info('Initializing cron jobs...');

  // Job 1: Check for scheduled posts every minute
  cron.schedule('* * * * *', async () => {
    try {
      logger.debug('Running scheduled posts check...');
      await checkAndPublishScheduledPosts();
    } catch (error) {
      logger.error('Scheduled posts check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('✅ Cron job registered: Check scheduled posts (every minute)');

  // Job 2: Refresh expiring tokens every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running token refresh check...');
      await refreshExpiringTokens();
    } catch (error) {
      logger.error('Token refresh check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('✅ Cron job registered: Refresh expiring tokens (every hour)');

  // Job 3: Sync analytics every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Running analytics sync...');
      await syncAllPublishedPosts();
    } catch (error) {
      logger.error('Analytics sync failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('✅ Cron job registered: Sync analytics (every 6 hours)');

  // Job 4: Cleanup old completed jobs daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running cleanup jobs...');
      await cleanupOldData();
    } catch (error) {
      logger.error('Cleanup jobs failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('✅ Cron job registered: Cleanup old data (daily at 2 AM)');

  logger.info('🚀 All cron jobs initialized successfully');
}

/**
 * Refresh tokens that are expiring within 24 hours
 */
async function refreshExpiringTokens(): Promise<void> {
  const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  try {
    const expiringAccounts = await prisma.socialAccount.findMany({
      where: {
        tokenExpiry: {
          lte: expiryThreshold,
        },
        status: 'ACTIVE',
        refreshToken: {
          not: null,
        },
      },
    });

    if (expiringAccounts.length === 0) {
      logger.debug('No tokens expiring soon');
      return;
    }

    logger.info(`Found ${expiringAccounts.length} tokens expiring soon`);

    for (const account of expiringAccounts) {
      try {
        // Platform-specific token refresh
        switch (account.platform) {
          case 'YOUTUBE':
            const { refreshYouTubeToken } = await import('../auth/youtube-oauth');
            await refreshYouTubeToken(account.id);
            break;

          case 'FACEBOOK':
            const { refreshFacebookToken } = await import('../auth/facebook-oauth');
            await refreshFacebookToken(account.id);
            break;

          case 'INSTAGRAM':
            // Instagram tokens are refreshed via Facebook
            logger.info(`Instagram token refresh handled by Facebook for account ${account.id}`);
            break;

          default:
            logger.warn(`Token refresh not implemented for platform ${account.platform}`);
        }

        logger.info(`Token refreshed for account ${account.id}`, {
          platform: account.platform,
          username: account.username,
        });
      } catch (error) {
        logger.error(`Failed to refresh token for account ${account.id}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          platform: account.platform,
        });

        // Mark account as expired after failure
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    logger.info('Token refresh completed', {
      total: expiringAccounts.length,
    });
  } catch (error) {
    logger.error('Token refresh check failed:', error);
    throw error;
  }
}

/**
 * Queue analytics sync for all recently published posts
 */
async function syncAllPublishedPosts(): Promise<void> {
  try {
    // Sync posts published in the last 30 days
    const recentPosts = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        platformPostId: { not: null },
        publishedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        accountId: true,
        platform: true,
      },
    });

    if (recentPosts.length === 0) {
      logger.debug('No recent published posts to sync');
      return;
    }

    logger.info(`Queuing analytics sync for ${recentPosts.length} posts`);

    let queuedCount = 0;

    for (const post of recentPosts) {
      try {
        // Add random delay to spread load (0-5 seconds)
        const delay = Math.floor(Math.random() * 5000);

        await analyticsSyncQueue.add(
          { postId: post.id },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 10000 },
            delay,
          }
        );

        queuedCount++;
      } catch (error) {
        logger.error(`Failed to queue analytics sync for post ${post.id}:`, error);
      }
    }

    logger.info('Analytics sync jobs queued', {
      total: recentPosts.length,
      queued: queuedCount,
    });
  } catch (error) {
    logger.error('Analytics sync failed:', error);
    throw error;
  }
}

/**
 * Cleanup old data to prevent database bloat
 */
async function cleanupOldData(): Promise<void> {
  try {
    logger.info('Starting cleanup...');

    // Delete analytics older than 90 days
    const analyticsDeleted = await prisma.analytics.deleteMany({
      where: {
        metricsDate: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    logger.info(`Deleted ${analyticsDeleted.count} old analytics records`);

    // Delete failed posts older than 30 days
    const failedPostsDeleted = await prisma.post.deleteMany({
      where: {
        status: 'FAILED',
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    logger.info(`Deleted ${failedPostsDeleted.count} old failed posts`);

    // Delete jobs older than 7 days
    const jobsDeleted = await prisma.job.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        status: {
          in: ['COMPLETED', 'FAILED', 'CANCELLED'],
        },
      },
    });

    logger.info(`Deleted ${jobsDeleted.count} old job records`);

    logger.info('Cleanup completed successfully');
  } catch (error) {
    logger.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Graceful shutdown - stop all cron jobs
 */
export function stopCronJobs(): void {
  logger.info('Stopping cron jobs...');
  cron.getTasks().forEach((task) => task.stop());
  logger.info('All cron jobs stopped');
}
