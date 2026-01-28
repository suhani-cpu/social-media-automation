import axios from 'axios';
import { SocialAccount } from '@prisma/client';
import { logger } from '../../../utils/logger';
import { AnalyticsData } from '../../analytics/sync';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Fetch analytics for an Instagram post
 */
export async function fetchInstagramAnalytics(
  account: SocialAccount,
  postId: string
): Promise<AnalyticsData> {
  try {
    logger.debug(`Fetching Instagram analytics for post ${postId}`);

    // For Instagram Business accounts, we need to use the Facebook Graph API
    // The postId should be the Instagram media ID

    const metricsToFetch = [
      'like_count',
      'comments_count',
      'saved',
      'shares', // Note: shares not available for all post types
      'reach',
      'impressions',
      'engagement',
    ];

    const response = await axios.get(`${INSTAGRAM_API_BASE}/${postId}`, {
      params: {
        fields: metricsToFetch.join(','),
        access_token: account.accessToken,
      },
    });

    const data = response.data;

    // Instagram doesn't provide shares for most content types
    // We'll use 0 as default
    const analytics: AnalyticsData = {
      views: data.impressions || data.reach || 0,
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      shares: data.shares || 0,
    };

    logger.info(`Instagram analytics fetched for post ${postId}`, analytics);

    return analytics;
  } catch (error: any) {
    logger.error(`Failed to fetch Instagram analytics for post ${postId}:`, {
      error: error.response?.data || error.message,
    });

    // Return zero metrics on error
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
  }
}

/**
 * Fetch Instagram account insights
 */
export async function fetchInstagramAccountInsights(
  account: SocialAccount,
  startDate: Date,
  endDate: Date
) {
  try {
    logger.debug(`Fetching Instagram account insights for ${account.username}`);

    // Fetch account-level insights
    const response = await axios.get(
      `${INSTAGRAM_API_BASE}/${account.accountId}/insights`,
      {
        params: {
          metric: [
            'impressions',
            'reach',
            'profile_views',
            'follower_count',
          ].join(','),
          period: 'day',
          since: Math.floor(startDate.getTime() / 1000),
          until: Math.floor(endDate.getTime() / 1000),
          access_token: account.accessToken,
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    logger.error(`Failed to fetch Instagram account insights:`, {
      error: error.response?.data || error.message,
    });
    return [];
  }
}
