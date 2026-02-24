import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { PostSchedulerService } from './post-scheduler.service';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postScheduler: PostSchedulerService,
    @InjectQueue('analytics-sync') private readonly analyticsSyncQueue: Queue,
  ) {
    this.logger.log('Cron jobs initialized');
  }

  // Check for scheduled posts every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPosts() {
    try {
      await this.postScheduler.checkAndPublishScheduledPosts();
    } catch (error) {
      this.logger.error('Scheduled posts check failed:', error);
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

      this.logger.log(`Found ${expiringAccounts.length} tokens expiring soon`);

      for (const account of expiringAccounts) {
        try {
          // Platform-specific refresh would be handled here
          // In NestJS we'd inject the specific OAuth services
          this.logger.log(`Token refresh needed for ${account.platform} account ${account.id}`);
        } catch (error) {
          this.logger.error(`Failed to refresh token for account ${account.id}:`, error);
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
