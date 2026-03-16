import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { publishToYouTube } from '../social-media/youtube/client';
import { publishToInstagram } from '../social-media/instagram/client';
import { publishToFacebook } from '../social-media/facebook/client';

export async function autoPublishVideo(videoId: string): Promise<void> {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        posts: {
          where: {
            status: 'DRAFT',
            platform: { not: undefined },
          },
          include: {
            account: true,
          },
        },
      },
    });

    if (!video) {
      logger.debug(`Video ${videoId} not found for auto-publish`);
      return;
    }

    if (video.status !== 'READY') {
      logger.debug(`Video ${videoId} not ready for auto-publish, status: ${video.status}`);
      return;
    }

    if (video.posts.length === 0) {
      logger.debug(`No draft posts found for video ${videoId}`);
      return;
    }

    logger.info(`Found ${video.posts.length} draft posts for video ${videoId}, starting auto-publish`);

    for (const post of video.posts) {
      if (!post.account || post.account.status !== 'ACTIVE') {
        logger.warn(`Skipping post ${post.id} - account not active`);
        continue;
      }

      try {
        logger.info(`Auto-publishing post ${post.id} to ${post.platform}`);

        // Update post status
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHING' },
        });

        let result: { id: string; url?: string; permalink?: string };

        switch (post.platform) {
          case 'YOUTUBE':
            result = await publishToYouTube(post, video, post.account);
            break;
          case 'INSTAGRAM':
            result = await publishToInstagram(post, video, post.account);
            break;
          case 'FACEBOOK':
            result = await publishToFacebook(post, video, post.account);
            break;
          default:
            throw new Error(`Unsupported platform: ${post.platform}`);
        }

        // Update post as published
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            platformPostId: result.id,
            platformUrl: result.url || result.permalink || '',
          },
        });

        logger.info(`Auto-published post ${post.id} to ${post.platform}`);
      } catch (error) {
        logger.error(`Failed to auto-publish post ${post.id}:`, error);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  } catch (error) {
    logger.error(`Auto-publish failed for video ${videoId}:`, error);
  }
}
