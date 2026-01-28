import { Post, Video, SocialAccount } from '@prisma/client';
import { uploadVideoToFacebook, FacebookUploadOptions } from './upload';
import { getFacebookInsights, FacebookAnalytics } from './analytics';
import { logger } from '../../../utils/logger';

/**
 * Publish post to Facebook
 */
export async function publishToFacebook(
  post: Post,
  video: Video,
  account: SocialAccount
): Promise<{ id: string; permalink: string }> {
  logger.info('Publishing to Facebook', {
    postId: post.id,
    videoId: video.id,
    accountId: account.id,
    postType: post.postType,
  });

  try {
    // Determine which video URL to use based on post type
    let videoUrl: string | null;

    if (post.postType === 'FEED') {
      // FEED type uses square format
      videoUrl = video.facebookSquareUrl;
    } else {
      // VIDEO type uses landscape format
      videoUrl = video.facebookLandscapeUrl;
    }

    if (!videoUrl) {
      throw new Error(
        `Video not processed for Facebook ${post.postType}. Video status: ${video.status}`
      );
    }

    // Build description from caption and hashtags
    let description = post.caption;
    if (post.hashtags && post.hashtags.length > 0) {
      description += '\n\n' + post.hashtags.join(' ');
    }

    // Prepare upload options
    const uploadOptions: FacebookUploadOptions = {
      videoPath: videoUrl,
      title: post.caption.substring(0, 100), // Use first 100 chars as title
      description,
      published: true,
    };

    // Note: account.accountId contains the Facebook Page ID
    // account.accessToken contains the Page access token (not user token)
    const result = await uploadVideoToFacebook(
      account.accountId,
      account.accessToken,
      uploadOptions
    );

    logger.info('Successfully published to Facebook', {
      postId: post.id,
      videoId: result.id,
      permalink: result.permalink,
    });

    return {
      id: result.id,
      permalink: result.permalink,
    };
  } catch (error) {
    logger.error('Failed to publish to Facebook:', {
      postId: post.id,
      videoId: video.id,
      accountId: account.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Get Facebook insights for a post
 */
export async function getFacebookVideoInsights(
  videoId: string,
  accessToken: string
): Promise<FacebookAnalytics> {
  logger.info('Fetching Facebook insights', { videoId });

  try {
    const analytics = await getFacebookInsights(videoId, accessToken);

    logger.info('Facebook insights fetched', {
      videoId,
      views: analytics.views,
      likes: analytics.likes,
    });

    return analytics;
  } catch (error) {
    logger.error('Failed to fetch Facebook insights:', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Validate Facebook video ID format
 */
export function isValidFacebookVideoId(videoId: string): boolean {
  // Facebook video IDs are numeric
  return /^\d+$/.test(videoId);
}

/**
 * Extract video ID from Facebook URL
 */
export function extractFacebookVideoId(url: string): string | null {
  const patterns = [
    /facebook\.com\/.*\/videos\/(\d+)/,
    /facebook\.com\/watch\/\?v=(\d+)/,
    /fb\.watch\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
