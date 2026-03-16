import { google } from 'googleapis';
import { getYouTubeAuthClient } from '../../auth/youtube-oauth';
import { logger } from '../../../utils/logger';

export interface YouTubeAnalytics {
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  favorites: number;
  duration?: string;
  averageViewDuration?: number;
  watchTimeMinutes?: number;
}

/**
 * Get analytics for a YouTube video
 */
export async function getYouTubeAnalytics(
  videoId: string,
  accountId: string
): Promise<YouTubeAnalytics> {
  try {
    const oauth2Client = await getYouTubeAuthClient(accountId);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Fetch video statistics
    const response = await youtube.videos.list({
      part: ['statistics', 'contentDetails'],
      id: [videoId],
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Video ${videoId} not found`);
    }

    const video = response.data.items[0];
    const stats = video.statistics;
    const contentDetails = video.contentDetails;

    const analytics: YouTubeAnalytics = {
      views: parseInt(stats?.viewCount || '0'),
      likes: parseInt(stats?.likeCount || '0'),
      dislikes: parseInt(stats?.dislikeCount || '0'),
      comments: parseInt(stats?.commentCount || '0'),
      shares: 0, // Not available in basic API
      favorites: parseInt(stats?.favoriteCount || '0'),
      duration: contentDetails?.duration ?? undefined,
    };

    logger.info('YouTube analytics fetched', {
      videoId,
      views: analytics.views,
      likes: analytics.likes,
    });

    return analytics;
  } catch (error) {
    logger.error('Failed to fetch YouTube analytics:', {
      videoId,
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch YouTube analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get detailed analytics using YouTube Analytics API
 * Note: Requires additional OAuth scope and API enablement
 */
export async function getYouTubeDetailedAnalytics(
  videoId: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  try {
    const oauth2Client = await getYouTubeAuthClient(accountId);
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

    const response = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
      dimensions: 'video',
      filters: `video==${videoId}`,
    });

    logger.info('YouTube detailed analytics fetched', {
      videoId,
      rows: response.data.rows?.length || 0,
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch YouTube detailed analytics:', {
      videoId,
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fall back to basic analytics
    return null;
  }
}

/**
 * Get channel information
 */
export async function getYouTubeChannelInfo(accountId: string): Promise<any> {
  try {
    const oauth2Client = await getYouTubeAuthClient(accountId);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('No channel found for this account');
    }

    const channel = response.data.items[0];

    logger.info('YouTube channel info fetched', {
      accountId,
      channelId: channel.id,
      title: channel.snippet?.title,
    });

    return {
      id: channel.id,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      customUrl: channel.snippet?.customUrl,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
    };
  } catch (error) {
    logger.error('Failed to fetch YouTube channel info:', {
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch channel info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
