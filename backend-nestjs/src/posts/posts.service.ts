import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService, UploadProgress } from '../social-media/youtube/youtube.service';
import { InstagramService } from '../social-media/instagram/instagram.service';
import { FacebookService } from '../social-media/facebook/facebook.service';
import { DriveService } from '../drive/drive.service';
import Redis from 'ioredis';

const PROGRESS_TTL = 120; // 2 minutes TTL for progress keys

@Injectable()
export class PostsService implements OnModuleInit {
  private readonly logger = new Logger(PostsService.name);
  private redis: Redis | null = null;

  // Fallback in-memory store if Redis unavailable
  private readonly fallbackProgress = new Map<string, UploadProgress>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly youtubeService: YouTubeService,
    private readonly instagramService: InstagramService,
    private readonly facebookService: FacebookService,
    private readonly driveService: DriveService,
  ) {}

  onModuleInit() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      this.redis.connect().catch(() => {
        this.logger.warn('Redis not available for publish progress — using in-memory fallback');
        this.redis = null;
      });
    } catch {
      this.logger.warn('Redis init failed — using in-memory fallback');
      this.redis = null;
    }
  }

  private async setProgress(postId: string, progress: UploadProgress) {
    if (this.redis) {
      try {
        await this.redis.setex(`publish-progress:${postId}`, PROGRESS_TTL, JSON.stringify(progress));
        return;
      } catch { /* fall through to in-memory */ }
    }
    this.fallbackProgress.set(postId, progress);
  }

  private async getProgress(postId: string): Promise<UploadProgress | null> {
    if (this.redis) {
      try {
        const data = await this.redis.get(`publish-progress:${postId}`);
        if (data) return JSON.parse(data);
        return null;
      } catch { /* fall through */ }
    }
    return this.fallbackProgress.get(postId) || null;
  }

  private async deleteProgress(postId: string) {
    if (this.redis) {
      try { await this.redis.del(`publish-progress:${postId}`); return; } catch { /* fall through */ }
    }
    this.fallbackProgress.delete(postId);
  }

  async create(userId: string, dto: {
    videoId: string;
    accountId: string;
    caption: string;
    language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';
    hashtags?: string[];
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
    postType: 'FEED' | 'REEL' | 'STORY' | 'VIDEO' | 'SHORT';
    scheduledFor?: string;
    metadata?: Record<string, any>;
  }) {
    // Verify video exists and belongs to user
    const video = await this.prisma.video.findFirst({
      where: { id: dto.videoId, userId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Verify account exists and belongs to user
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: dto.accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    const post = await this.prisma.post.create({
      data: {
        userId,
        videoId: dto.videoId,
        accountId: dto.accountId,
        caption: dto.caption,
        language: dto.language,
        hashtags: dto.hashtags || [],
        platform: dto.platform,
        postType: dto.postType,
        status: dto.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        metadata: dto.metadata || undefined,
      },
    });

    this.logger.log(`Post ${post.id} created by user ${userId}`);
    return { message: 'Post created successfully', post };
  }

  async findAll(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: { userId },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { posts };
  }

  /**
   * Publish a post — kicks off background upload and returns immediately.
   */
  async publish(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
      include: {
        video: true,
        account: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === 'PUBLISHING') {
      return { message: 'Post is already being published', postId: post.id };
    }

    if (post.status === 'PUBLISHED') {
      return { message: 'Post is already published', postId: post.id };
    }

    // Update status to publishing
    await this.prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHING' },
    });

    // Initialize progress
    this.setProgress(post.id, {
      stage: 'downloading',
      percent: 0,
      message: 'Starting publish...',
    });

    // Run publish in background (don't await)
    this.executePublish(post.id, post, post.video!, post.account!).catch((err) => {
      this.logger.error(`Background publish failed for post ${post.id}:`, err);
    });

    return { message: 'Publishing started', postId: post.id };
  }

  /**
   * Get current publish progress for a post.
   */
  async getPublishProgress(postId: string): Promise<UploadProgress> {
    const progress = await this.getProgress(postId);
    return progress || {
      stage: 'done',
      percent: 100,
      message: 'No active publish',
    };
  }

  /**
   * Background publish execution — downloads from Drive if needed, converts, uploads.
   */
  private async executePublish(
    postId: string,
    post: any,
    video: any,
    account: any,
  ) {
    let driveDownloadPath: string | null = null;

    try {
      let result: { id: string; permalink?: string; url?: string };

      if (!video) {
        throw new BadRequestException('Post has no associated video');
      }
      if (!account) {
        throw new BadRequestException('Post has no associated social account');
      }

      // If video has no rawVideoUrl but has a Drive file ID, download from Drive first
      const metadata = video.metadata as Record<string, any> | null;
      if (!video.rawVideoUrl && metadata?.driveFileId) {
        this.setProgress(postId, {
          stage: 'downloading',
          percent: 0,
          message: 'Downloading from Google Drive...',
        });

        driveDownloadPath = await this.driveService.downloadToTemp(
          post.userId,
          metadata.driveFileId,
          metadata.driveFileName,
        );

        // Update video with the local path so upload services can use it
        video.rawVideoUrl = driveDownloadPath;

        this.setProgress(postId, {
          stage: 'downloading',
          percent: 100,
          message: 'Download complete',
        });
      }

      if (post.platform === 'INSTAGRAM') {
        this.setProgress(postId, {
          stage: 'uploading',
          percent: 0,
          message: 'Publishing to Instagram...',
        });

        const igResult = await this.instagramService.publishToInstagram(
          post,
          video,
          account,
        );
        result = { id: igResult.id, permalink: igResult.permalink };
      } else if (post.platform === 'YOUTUBE') {
        result = await this.youtubeService.publishToYouTube(
          post,
          video,
          account,
          (progress) => {
            this.setProgress(postId, progress);
          },
        );
      } else if (post.platform === 'FACEBOOK') {
        this.setProgress(postId, {
          stage: 'uploading',
          percent: 0,
          message: 'Publishing to Facebook...',
        });

        const fbResult = await this.facebookService.publishToFacebook(
          post,
          video,
          account,
        );
        result = { id: fbResult.id, permalink: fbResult.permalink };
      } else {
        throw new BadRequestException(`Unsupported platform: ${post.platform}`);
      }

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          platformPostId: result.id,
          platformUrl: result.permalink || result.url,
        },
      });

      this.setProgress(postId, {
        stage: 'done',
        percent: 100,
        message: 'Published successfully!',
      });

      this.logger.log(`Post ${postId} published to ${post.platform}`);

      // Progress auto-expires via Redis TTL (or clean up fallback after 60s)
      setTimeout(() => this.deleteProgress(postId), 60000);
    } catch (publishError: any) {
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'FAILED',
          errorMessage: publishError.message,
        },
      });

      this.setProgress(postId, {
        stage: 'error',
        percent: 0,
        message: publishError.message || 'Publishing failed',
      });

      // Progress auto-expires via Redis TTL (or clean up fallback after 60s)
      setTimeout(() => this.deleteProgress(postId), 60000);
    } finally {
      // Clean up Drive temp file if we downloaded one
      if (driveDownloadPath) {
        try {
          const fs = await import('fs/promises');
          await fs.unlink(driveDownloadPath);
          this.logger.log(`Cleaned up Drive temp file: ${driveDownloadPath}`);
        } catch { /* ignore cleanup errors */ }
      }
    }
  }

  /**
   * Batch publish multiple posts — kicks off background publish for each.
   */
  async batchPublish(userId: string, postIds: string[]) {
    if (!postIds || postIds.length === 0) {
      throw new BadRequestException('postIds is required');
    }

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId,
        status: { in: ['DRAFT', 'SCHEDULED', 'FAILED'] },
      },
      include: { video: true, account: true },
    });

    if (posts.length === 0) {
      throw new BadRequestException('No publishable posts found');
    }

    // Mark all posts as PUBLISHING
    const results: Array<{ postId: string; status: string; message: string }> = [];

    for (const post of posts) {
      await this.prisma.post.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING' },
      });
      this.setProgress(post.id, {
        stage: 'downloading',
        percent: 0,
        message: 'Queued for publish...',
      });
      results.push({ postId: post.id, status: 'publishing', message: 'Publishing started' });
    }

    // Group by platform and limit concurrency (max 2 per platform to avoid rate limits)
    const byPlatform = new Map<string, typeof posts>();
    for (const post of posts) {
      const group = byPlatform.get(post.platform) || [];
      group.push(post);
      byPlatform.set(post.platform, group);
    }

    // Process each platform group with concurrency limit of 2
    for (const [platform, platformPosts] of byPlatform) {
      const concurrencyLimit = 2;
      for (let i = 0; i < platformPosts.length; i += concurrencyLimit) {
        const batch = platformPosts.slice(i, i + concurrencyLimit);
        // Fire-and-forget each mini-batch (parallel within limit, sequential between batches)
        const batchPromises = batch.map((post) =>
          this.executePublish(post.id, post, post.video!, post.account!).catch((err) => {
            this.logger.error(`Background publish failed for post ${post.id}:`, err);
          }),
        );
        // Don't await — let them run in background, but stagger platform batches slightly
        Promise.allSettled(batchPromises).then(() => {
          this.logger.log(`Batch for ${platform} (${i}-${i + batch.length}) completed`);
        });
        // Small delay between batches for the same platform
        if (i + concurrencyLimit < platformPosts.length) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    this.logger.log(`Batch publish started (rate-limited): ${posts.length} posts for user ${userId}`);

    return {
      message: `Publishing ${posts.length} posts`,
      total: posts.length,
      results,
    };
  }

  /**
   * Retry publishing a failed post.
   */
  async retryPublish(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId, status: 'FAILED' },
      include: { video: true, account: true },
    });

    if (!post) {
      throw new NotFoundException('Failed post not found');
    }

    await this.prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHING', errorMessage: null },
    });

    this.setProgress(post.id, {
      stage: 'downloading',
      percent: 0,
      message: 'Retrying publish...',
    });

    this.executePublish(post.id, post, post.video!, post.account!).catch((err) => {
      this.logger.error(`Retry publish failed for post ${post.id}:`, err);
    });

    this.logger.log(`Retry publish started for post ${postId}`);
    return { message: 'Retry started', postId: post.id };
  }

  /**
   * Delete a post.
   */
  async delete(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.delete({ where: { id: post.id } });

    this.logger.log(`Post ${postId} deleted by user ${userId}`);
    return { message: 'Post deleted successfully' };
  }

  async getScheduledSummary() {
    const now = new Date();

    const scheduledPosts = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { gte: now },
      },
      include: {
        video: {
          select: { id: true, title: true, thumbnailUrl: true },
        },
        account: {
          select: { id: true, platform: true, username: true },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    const byPlatform = scheduledPosts.reduce((acc, post) => {
      const platform = post.platform;
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(post);
      return acc;
    }, {} as Record<string, typeof scheduledPosts>);

    return {
      message: 'Scheduled posts summary',
      summary: {
        total: scheduledPosts.length,
        byPlatform,
        posts: scheduledPosts,
      },
    };
  }

  async reschedule(userId: string, postId: string, scheduledFor: string) {
    if (!scheduledFor) {
      throw new BadRequestException('scheduledFor is required');
    }

    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const newScheduledDate = new Date(scheduledFor);

    await this.prisma.post.update({
      where: { id: post.id },
      data: {
        scheduledFor: newScheduledDate,
        status: 'SCHEDULED',
      },
    });

    this.logger.log(`Post ${postId} rescheduled to ${newScheduledDate.toISOString()} by user ${userId}`);
    return {
      message: 'Post rescheduled successfully',
      scheduledFor: newScheduledDate,
    };
  }
}
