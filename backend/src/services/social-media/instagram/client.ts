import { Post, Video, SocialAccount } from '@prisma/client';
import { uploadVideoToInstagram, InstagramUploadOptions } from './upload';
import { getInstagramMediaInsights, InstagramAnalytics } from './analytics';
import { logger } from '../../../utils/logger';

/**
 * Publish post to Instagram
 */
export async function publishToInstagram(
  post: Post,
  video: Video,
  account: SocialAccount
): Promise<{ id: string; permalink: string }> {
  logger.info('Publishing to Instagram', {
    postId: post.id,
    videoId: video.id,
    accountId: account.id,
    postType: post.postType,
  });

  try {
    // Determine which video URL to use based on post type
    let videoUrl: string | null;

    if (post.postType === 'REEL') {
      // Use vertical format for Reels
      videoUrl = video.instagramReelUrl;
    } else {
      // Use square format for Feed posts
      videoUrl = video.instagramFeedUrl;
    }

    if (!videoUrl) {
      throw new Error(
        `Video not processed for Instagram ${post.postType}. Video status: ${video.status}`
      );
    }

    // Build caption from post caption and hashtags
    let caption = post.caption;
    if (post.hashtags && post.hashtags.length > 0) {
      caption += '\n\n' + post.hashtags.join(' ');
    }

    // Instagram has a 2,200 character limit for captions
    if (caption.length > 2200) {
      caption = caption.substring(0, 2197) + '...';
    }

    // Get Instagram account ID from metadata
    // The account.accountId should contain the Instagram Business Account ID
    const instagramAccountId = account.accountId;

    // Prepare upload options
    const uploadOptions: InstagramUploadOptions = {
      videoPath: videoUrl,
      caption,
      shareToFeed: true, // Share Reels to feed by default
      coverUrl: video.thumbnailUrl || undefined,
    };

    // Upload to Instagram
    const result = await uploadVideoToInstagram(
      instagramAccountId,
      account.accessToken,
      uploadOptions
    );

    logger.info('Successfully published to Instagram', {
      postId: post.id,
      mediaId: result.id,
      permalink: result.permalink,
    });

    return {
      id: result.id,
      permalink: result.permalink,
    };
  } catch (error) {
    logger.error('Failed to publish to Instagram:', {
      postId: post.id,
      videoId: video.id,
      accountId: account.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Get Instagram insights for a post
 */
export async function getInstagramInsights(
  mediaId: string,
  accessToken: string
): Promise<InstagramAnalytics> {
  logger.info('Fetching Instagram insights', { mediaId });

  try {
    const analytics = await getInstagramMediaInsights(mediaId, accessToken);

    logger.info('Instagram insights fetched', {
      mediaId,
      views: analytics.views,
      likes: analytics.likes,
    });

    return analytics;
  } catch (error) {
    logger.error('Failed to fetch Instagram insights:', {
      mediaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Validate Instagram media ID format
 */
export function isValidInstagramMediaId(mediaId: string): boolean {
  // Instagram media IDs are numeric strings
  return /^\d+_\d+$/.test(mediaId) || /^\d+$/.test(mediaId);
}

/**
 * Extract media ID from Instagram URL
 */
export function extractInstagramMediaId(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
    /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
    /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
