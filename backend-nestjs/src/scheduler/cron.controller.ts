import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';

/**
 * Vercel Cron endpoint for processing scheduled posts.
 *
 * Vercel invokes GET/POST to /api/cron/process-scheduled on the configured
 * schedule. The request includes an `authorization` header with the value
 * `Bearer <CRON_SECRET>` which we validate to prevent unauthorized access.
 *
 * Unlike the Bull-queue-based PostSchedulerService, this controller calls
 * PostsService.publish() synchronously — which is what Vercel serverless
 * requires (background tasks get killed).
 */
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
  ) {}

  /**
   * Process all posts whose scheduledFor time has passed.
   *
   * Vercel sends: Authorization: Bearer <CRON_SECRET>
   * Docs: https://vercel.com/docs/cron-jobs
   */
  @Get('process-scheduled')
  async processScheduledPosts(
    @Headers('authorization') authHeader: string,
  ) {
    this.verifyCronSecret(authHeader);

    const now = new Date();
    this.logger.log(`Cron: checking for scheduled posts (now=${now.toISOString()})`);

    const scheduledPosts = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
      include: {
        video: { select: { id: true, title: true, status: true } },
        account: { select: { id: true, platform: true, username: true, status: true } },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 10, // Process max 10 per invocation to stay within serverless timeout
    });

    if (scheduledPosts.length === 0) {
      this.logger.log('Cron: no scheduled posts to process');
      return { message: 'No scheduled posts to process', processed: 0 };
    }

    this.logger.log(`Cron: found ${scheduledPosts.length} posts to publish`);

    const results: Array<{
      postId: string;
      status: string;
      message: string;
    }> = [];

    for (const post of scheduledPosts) {
      try {
        // Skip posts with videos not ready
        if (post.video?.status !== 'READY') {
          await this.prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'FAILED',
              errorMessage: `Video not ready: ${post.video?.status}`,
            },
          });
          results.push({
            postId: post.id,
            status: 'FAILED',
            message: `Video not ready: ${post.video?.status}`,
          });
          continue;
        }

        // Skip posts with inactive accounts
        if (post.account.status !== 'ACTIVE') {
          await this.prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'FAILED',
              errorMessage: `Account not active: ${post.account.status}`,
            },
          });
          results.push({
            postId: post.id,
            status: 'FAILED',
            message: `Account not active: ${post.account.status}`,
          });
          continue;
        }

        // Publish synchronously using PostsService (Vercel-compatible)
        const result = await this.postsService.publish(post.userId, post.id);
        results.push({
          postId: post.id,
          status: 'PUBLISHED',
          message: result.message,
        });

        this.logger.log(`Cron: published post ${post.id}`);
      } catch (error: any) {
        this.logger.error(`Cron: failed to publish post ${post.id}:`, error);
        results.push({
          postId: post.id,
          status: 'FAILED',
          message: error.message || 'Unknown error',
        });
      }
    }

    const published = results.filter((r) => r.status === 'PUBLISHED').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;

    this.logger.log(
      `Cron: finished — ${published} published, ${failed} failed out of ${scheduledPosts.length}`,
    );

    return {
      message: `Processed ${scheduledPosts.length} scheduled posts`,
      processed: scheduledPosts.length,
      published,
      failed,
      results,
    };
  }

  private verifyCronSecret(authHeader: string) {
    const cronSecret = this.configService.get<string>('CRON_SECRET');

    if (!cronSecret) {
      this.logger.warn('CRON_SECRET not configured — rejecting cron request');
      throw new UnauthorizedException('Cron endpoint not configured');
    }

    // Vercel sends: "Bearer <secret>"
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (token !== cronSecret) {
      this.logger.warn('Invalid cron secret received');
      throw new UnauthorizedException('Invalid cron secret');
    }
  }
}
