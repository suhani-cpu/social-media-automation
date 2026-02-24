import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramService } from '../social-media/instagram/instagram.service';
import { YouTubeService } from '../social-media/youtube/youtube.service';
import { FacebookService } from '../social-media/facebook/facebook.service';

export interface PostPublishingJobData {
  postId: string;
  userId: string;
}

@Processor('post-publishing')
export class PostPublishingProcessor {
  private readonly logger = new Logger(PostPublishingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramService: InstagramService,
    private readonly youtubeService: YouTubeService,
    private readonly facebookService: FacebookService,
  ) {}

  @Process()
  async handle(job: Job<PostPublishingJobData>) {
    const { postId } = job.data;
    this.logger.log(`Starting post publishing for ${postId}`);

    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: { video: true, account: true },
      });

      if (!post || !post.video || !post.account) {
        throw new Error(`Post ${postId} or its relations not found`);
      }

      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHING' },
      });

      await job.progress(30);

      let platformPostId: string;
      let platformUrl: string;

      switch (post.platform) {
        case 'INSTAGRAM': {
          const result = await this.instagramService.publishToInstagram(post, post.video, post.account);
          platformPostId = result.id;
          platformUrl = result.permalink;
          break;
        }
        case 'YOUTUBE': {
          const result = await this.youtubeService.publishToYouTube(post, post.video, post.account);
          platformPostId = result.id;
          platformUrl = result.url;
          break;
        }
        case 'FACEBOOK': {
          const result = await this.facebookService.publishToFacebook(post, post.video, post.account);
          platformPostId = result.id;
          platformUrl = result.permalink;
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }

      await job.progress(90);

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          platformPostId,
          platformUrl,
        },
      });

      this.logger.log(`Post ${postId} published to ${post.platform}`);
      await job.progress(100);
    } catch (error) {
      this.logger.error(`Post publishing failed for ${postId}:`, error);

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }
}
