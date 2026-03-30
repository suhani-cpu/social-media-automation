import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { PostSchedulerService } from './post-scheduler.service';
import { YouTubeOAuthService } from '../oauth/services/youtube-oauth.service';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postScheduler: PostSchedulerService,
    private readonly youtubeOAuth: YouTubeOAuthService,
    @InjectQueue('analytics-sync') private readonly analyticsSyncQueue: Queue,
  ) {
    this.logger.log('Cron jobs initialized');
  }

  // Check for scheduled posts every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPosts() {
    try {
      // First: reset any posts stuck in PUBLISHING for > 10 minutes
      await this.resetStuckPublishingPosts();
      // Then: process scheduled posts
      await this.postScheduler.checkAndPublishScheduledPosts();
    } catch (error) {
      this.logger.error('Scheduled posts check failed:', error);
    }
  }

  // Reset posts stuck in PUBLISHING status for more than 10 minutes
  async resetStuckPublishingPosts() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    try {
      const stuckPosts = await this.prisma.post.updateMany({
        where: {
          status: 'PUBLISHING',
          updatedAt: { lt: tenMinutesAgo },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Publishing timed out — auto-reset after 10 minutes. Try again with a smaller video.',
        },
      });
      if (stuckPosts.count > 0) {
        this.logger.warn(`Reset ${stuckPosts.count} stuck PUBLISHING posts to FAILED`);
      }
    } catch (error) {
      this.logger.error('Failed to reset stuck posts:', error);
    }
  }

  // Refresh expiring tokens every hour
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens() {
    const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const expiringAccounts = await this.prisma.socialAccount.findMany({
        where: {
          tokenExpiry: { lte: expiryThreshold },
          status: 'ACTIVE',
          refreshToken: { not: null },
        },
      });

      if (expiringAccounts.length === 0) return;

      this.logger.log(`Found ${expiringAccounts.length} tokens expiring soon — refreshing`);

      for (const account of expiringAccounts) {
        try {
          if (account.platform === 'YOUTUBE') {
            await this.youtubeOAuth.refreshToken(account.id);
            this.logger.log(`✅ YouTube token refreshed for ${account.username}`);
          } else if (account.platform === 'GOOGLE_DRIVE') {
            // Drive uses googleapis OAuth2 — refresh directly
            const { google } = await import('googleapis');
            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_DRIVE_CLIENT_ID,
              process.env.GOOGLE_DRIVE_CLIENT_SECRET,
            );
            oauth2Client.setCredentials({ refresh_token: account.refreshToken });
            const { credentials } = await oauth2Client.refreshAccessToken();
            await this.prisma.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: credentials.access_token!,
                tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
              },
            });
            this.logger.log(`✅ Drive token refreshed for ${account.username}`);
          } else if (account.platform === 'FACEBOOK' || account.platform === 'INSTAGRAM') {
            // Facebook/IG long-lived tokens last 60 days, can't easily refresh
            this.logger.log(`⚠️ ${account.platform} token expiring — user needs to reconnect`);
          }
        } catch (error: any) {
          this.logger.error(`❌ Failed to refresh ${account.platform} token for ${account.username}: ${error.message}`);
          await this.prisma.socialAccount.update({
            where: { id: account.id },
            data: { status: 'EXPIRED' },
          });
        }
      }
    } catch (error) {
      this.logger.error('Token refresh check failed:', error);
    }
  }

  // Sync analytics every 6 hours
  @Cron('0 */6 * * *')
  async syncAllPublishedPosts() {
    try {
      const recentPosts = await this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          platformPostId: { not: null },
          publishedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true },
      });

      if (recentPosts.length === 0) return;

      this.logger.log(`Queuing analytics sync for ${recentPosts.length} posts`);

      for (const post of recentPosts) {
        const delay = Math.floor(Math.random() * 5000);
        await this.analyticsSyncQueue.add(
          { postId: post.id },
          { attempts: 2, backoff: { type: 'exponential', delay: 10000 }, delay },
        );
      }
    } catch (error) {
      this.logger.error('Analytics sync failed:', error);
    }
  }

  // Cleanup old data daily at 2 AM
  @Cron('0 2 * * *')
  async cleanupOldData() {
    try {
      this.logger.log('Starting cleanup...');

      const analyticsDeleted = await this.prisma.analytics.deleteMany({
        where: { metricsDate: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      });
      this.logger.log(`Deleted ${analyticsDeleted.count} old analytics records`);

      const failedPostsDeleted = await this.prisma.post.deleteMany({
        where: {
          status: 'FAILED',
          createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });
      this.logger.log(`Deleted ${failedPostsDeleted.count} old failed posts`);

      const jobsDeleted = await this.prisma.job.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        },
      });
      this.logger.log(`Deleted ${jobsDeleted.count} old job records`);

      this.logger.log('Cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }
}
