import axios from 'axios';
import { logger } from '../../../utils/logger';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement: number;
}

/**
 * Get Instagram media insights (analytics)
 */
export async function getInstagramMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<InstagramAnalytics> {
  try {
    // Instagram Insights API metrics
    const metrics = [
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'saves',
      'video_views', // For Reels
    ];

    const response = await axios.get(`${FACEBOOK_API_BASE}/${mediaId}/insights`, {
      params: {
        metric: metrics.join(','),
        access_token: accessToken,
      },
    });

    const data = response.data.data;

    // Parse metrics from response
    const analytics: any = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      impressions: 0,
      engagement: 0,
    };

    data.forEach((metric: any) => {
      const name = metric.name;
      const value = metric.values[0]?.value || 0;

      switch (name) {
        case 'impressions':
          analytics.impressions = value;
          break;
        case 'reach':
          analytics.reach = value;
          break;
        case 'likes':
          analytics.likes = value;
          break;
        case 'comments':
          analytics.comments = value;
          break;
        case 'shares':
          analytics.shares = value;
          break;
        case 'saves':
          analytics.saves = value;
          break;
        case 'video_views':
          analytics.views = value;
          break;
      }
    });

    // Calculate engagement rate
    if (analytics.reach > 0) {
      const totalEngagements = analytics.likes + analytics.comments + analytics.shares + analytics.saves;
      analytics.engagement = (totalEngagements / analytics.reach) * 100;
    }

    logger.info('Instagram media insights fetched', {
      mediaId,
      analytics,
    });

    return analytics;
  } catch (error) {
    logger.error('Failed to fetch Instagram insights:', {
      mediaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Instagram account insights (profile analytics)
 */
export async function getInstagramAccountInsights(
  instagramAccountId: string,
  accessToken: string,
  period: 'day' | 'week' | 'days_28' = 'day'
): Promise<any> {
  try {
    const metrics = [
      'impressions',
      'reach',
      'profile_views',
      'follower_count',
      'email_contacts',
      'phone_call_clicks',
      'text_message_clicks',
      'get_directions_clicks',
      'website_clicks',
    ];

    const response = await axios.get(`${FACEBOOK_API_BASE}/${instagramAccountId}/insights`, {
      params: {
        metric: metrics.join(','),
        period: period,
        access_token: accessToken,
      },
    });

    logger.info('Instagram account insights fetched', {
      instagramAccountId,
      period,
    });

    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch Instagram account insights:', {
      instagramAccountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch account insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Instagram media details
 */
export async function getInstagramMediaDetails(
  mediaId: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/${mediaId}`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        access_token: accessToken,
      },
    });

    logger.info('Instagram media details fetched', { mediaId });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch Instagram media details:', {
      mediaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch media details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
