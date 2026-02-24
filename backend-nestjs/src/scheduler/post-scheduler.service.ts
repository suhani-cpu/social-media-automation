import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostSchedulerService {
  private readonly logger = new Logger(PostSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('post-publishing') private readonly postPublishingQueue: Queue,
  ) {}

  async checkAndPublishScheduledPosts() {
    const now = new Date();

    const scheduledPosts = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
      include: {
        video: { select: { id: true, title: true, status: true } },
        account: { select: { id: true, platform: true, username: true, status: true } },
      },
    });

    if (scheduledPosts.length === 0) return;

    this.logger.log(`Found ${scheduledPosts.length} posts to publish`);

    for (const post of scheduledPosts) {
      try {
        if (post.video?.status !== 'READY') {
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'FAILED', errorMessage: `Video not ready: ${post.video?.status}` },
          });
          continue;
        }

        if (post.account.status !== 'ACTIVE') {
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'FAILED', errorMessage: `Account not active: ${post.account.status}` },
          });
          continue;
        }

        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHING' },
        });

        await this.postPublishingQueue.add(
          { postId: post.id, userId: post.userId },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );

        this.logger.log(`Queued post ${post.id} for publishing`);
      } catch (error) {
        this.logger.error(`Failed to queue post ${post.id}:`, error);
      }
    }
  }

  async getScheduledSummary() {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [upcoming, today, thisWeek] = await Promise.all([
      this.prisma.post.count({ where: { status: 'SCHEDULED', scheduledFor: { gte: now } } }),
      this.prisma.post.count({ where: { status: 'SCHEDULED', scheduledFor: { gte: now, lte: todayEnd } } }),
      this.prisma.post.count({ where: { status: 'SCHEDULED', scheduledFor: { gte: now, lte: weekEnd } } }),
    ]);

    return { upcoming, today, thisWeek };
  }

  async reschedule(postId: string, newScheduledFor: Date) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { scheduledFor: newScheduledFor, status: 'SCHEDULED' },
    });
    this.logger.log(`Post ${postId} rescheduled to ${newScheduledFor}`);
  }
}
