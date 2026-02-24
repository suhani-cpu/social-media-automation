import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AnalyticsSyncJobData {
  postId: string;
}

@Processor('analytics-sync')
export class AnalyticsSyncProcessor {
  private readonly logger = new Logger(AnalyticsSyncProcessor.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Process()
  async handle(job: Job<AnalyticsSyncJobData>) {
    const { postId } = job.data;
    this.logger.log(`Starting analytics sync for post ${postId}`);

    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }
      await this.analyticsService.syncPostAnalytics(post.userId, postId);
      this.logger.log(`Analytics sync completed for post ${postId}`);
    } catch (error) {
      this.logger.error(`Analytics sync failed for post ${postId}:`, error);
      throw error;
    }
  }
}
