import { Post, Video, SocialAccount } from '@prisma/client';
import { uploadVideoToYouTube, YouTubeUploadOptions } from './upload';
import { getYouTubeAnalytics, YouTubeAnalytics } from './analytics';
import { logger } from '../../../utils/logger';

/**
 * Publish post to YouTube
 */
export async function publishToYouTube(
  post: Post,
  video: Video,
  account: SocialAccount
): Promise<{ id: string; url: string }> {
  logger.info('Publishing to YouTube', {
    postId: post.id,
    videoId: video.id,
    accountId: account.id,
    postType: post.postType,
  });

  try {
    // Determine which video URL to use based on post type
    let videoUrl: string | null;
    let isShort = false;

    if (post.postType === 'SHORT') {
      videoUrl = video.youtubeShortsUrl;
      isShort = true;
    } else if (post.postType === 'FEED') {
      // FEED type for YouTube uses square format
      videoUrl = video.youtubeSquareUrl;
    } else {
      // VIDEO type uses landscape format
      videoUrl = video.youtubeVideoUrl;
    }

    if (!videoUrl) {
      throw new Error(
        `Video not processed for YouTube ${post.postType}. Video status: ${video.status}`
      );
    }

    // Build description from caption and hashtags
    let description = post.caption;
    if (post.hashtags && post.hashtags.length > 0) {
      description += '\n\n' + post.hashtags.join(' ');
    }

    // Extract tags from hashtags (remove # symbol)
    const tags = post.hashtags.map((tag) => tag.replace('#', '').trim());

    // Prepare upload options
    const uploadOptions: YouTubeUploadOptions = {
      videoPath: videoUrl,
      title: post.caption.substring(0, 100), // Use first 100 chars of caption as title
      description,
      tags,
      language: mapLanguageToYouTubeCode(post.language),
      privacyStatus: 'public',
      isShort,
      madeForKids: false,
    };

    // Upload to YouTube
    const result = await uploadVideoToYouTube(account.id, uploadOptions);

    logger.info('Successfully published to YouTube', {
      postId: post.id,
      videoId: result.id,
      url: result.url,
      isShort,
    });

    return {
      id: result.id,
      url: result.url,
    };
  } catch (error) {
    logger.error('Failed to publish to YouTube:', {
      postId: post.id,
      videoId: video.id,
      accountId: account.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Get YouTube insights for a post
 */
export async function getYouTubeInsights(
  videoId: string,
  accountId: string
): Promise<YouTubeAnalytics> {
  logger.info('Fetching YouTube insights', { videoId, accountId });

  try {
    const analytics = await getYouTubeAnalytics(videoId, accountId);

    logger.info('YouTube insights fetched', {
      videoId,
      views: analytics.views,
      likes: analytics.likes,
    });

    return analytics;
  } catch (error) {
    logger.error('Failed to fetch YouTube insights:', {
      videoId,
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Map application language to YouTube language code
 */
function mapLanguageToYouTubeCode(language: string): string {
  const languageMap: Record<string, string> = {
    ENGLISH: 'en',
    HINDI: 'hi',
    HINGLISH: 'en', // Use English for Hinglish
    HARYANVI: 'hi', // Use Hindi for Haryanvi
  };

  return languageMap[language] || 'en';
}

/**
 * Validate YouTube video URL format
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  // YouTube video IDs are 11 characters long
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
