import axios from 'axios';
import { logger } from '../../../utils/logger';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

export interface FacebookAnalytics {
  views: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  avgWatchTime?: number;
}

/**
 * Get Facebook video insights
 */
export async function getFacebookInsights(
  videoId: string,
  accessToken: string
): Promise<FacebookAnalytics> {
  try {
    // Get video insights
    const insightsResponse = await axios.get(
      `${FACEBOOK_API_BASE}/${videoId}/video_insights`,
      {
        params: {
          metric: [
            'total_video_views',
            'total_video_views_unique',
            'total_video_avg_time_watched',
          ].join(','),
          access_token: accessToken,
        },
      }
    );

    // Get video engagement (likes, comments, shares)
    const videoResponse = await axios.get(`${FACEBOOK_API_BASE}/${videoId}`, {
      params: {
        fields: 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
        access_token: accessToken,
      },
    });

    // Parse insights
    const insights = insightsResponse.data.data.reduce((acc: any, metric: any) => {
      const name = metric.name;
      const value = metric.values[0]?.value || 0;
      acc[name] = value;
      return acc;
    }, {});

    // Parse engagement
    const engagement = videoResponse.data;

    const analytics: FacebookAnalytics = {
      views: insights.total_video_views || 0,
      uniqueViews: insights.total_video_views_unique || 0,
      likes: engagement.likes?.summary?.total_count || 0,
      comments: engagement.comments?.summary?.total_count || 0,
      shares: engagement.shares?.count || 0,
      reactions: engagement.reactions?.summary?.total_count || 0,
      avgWatchTime: insights.total_video_avg_time_watched || 0,
    };

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

    throw new Error(
      `Failed to fetch Facebook insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Facebook Page insights
 */
export async function getFacebookPageInsights(
  pageId: string,
  accessToken: string,
  period: 'day' | 'week' | 'days_28' = 'day'
): Promise<any> {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/${pageId}/insights`, {
      params: {
        metric: [
          'page_views_total',
          'page_fans',
          'page_impressions',
          'page_video_views',
          'page_post_engagements',
        ].join(','),
        period,
        access_token: accessToken,
      },
    });

    const insights = response.data.data.reduce((acc: any, metric: any) => {
      acc[metric.name] = metric.values[0]?.value || 0;
      return acc;
    }, {});

    logger.info('Facebook page insights fetched', { pageId });

    return insights;
  } catch (error) {
    logger.error('Failed to fetch Facebook page insights:', {
      pageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch page insights: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get video details
 */
export async function getFacebookVideoDetails(
  videoId: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/${videoId}`, {
      params: {
        fields: 'id,title,description,created_time,length,permalink_url,picture',
        access_token: accessToken,
      },
    });

    logger.info('Facebook video details fetched', { videoId });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch Facebook video details:', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to fetch video details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
