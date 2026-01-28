import axios from 'axios';
import { Post, Video, SocialAccount } from '@prisma/client';
import { config } from '../../../config/env';
import { logger } from '../../../utils/logger';

const INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';

export async function publishToInstagram(
  post: Post,
  video: Video,
  account: SocialAccount
): Promise<{ id: string; permalink: string }> {
  try {
    logger.info(`Publishing to Instagram: ${post.id}`);

    // Select appropriate video URL based on post type
    const videoUrl =
      post.postType === 'REEL' ? video.instagramReelUrl : video.instagramFeedUrl;

    if (!videoUrl) {
      throw new Error('Video not processed for Instagram');
    }

    // Step 1: Create container
    const containerResponse = await axios.post(
      `${INSTAGRAM_API_BASE}/${account.accountId}/media`,
      {
        video_url: videoUrl,
        caption: `${post.caption}\n\n${post.hashtags.join(' ')}`,
        media_type: post.postType === 'REEL' ? 'REELS' : 'VIDEO',
        access_token: account.accessToken,
      }
    );

    const containerId = containerResponse.data.id;
    logger.info(`Instagram container created: ${containerId}`);

    // Step 2: Wait for container to be ready (poll status)
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!isReady && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(
        `${INSTAGRAM_API_BASE}/${containerId}`,
        {
          params: {
            fields: 'status_code',
            access_token: account.accessToken,
          },
        }
      );

      const statusCode = statusResponse.data.status_code;

      if (statusCode === 'FINISHED') {
        isReady = true;
      } else if (statusCode === 'ERROR') {
        throw new Error('Instagram container processing failed');
      }

      attempts++;
    }

    if (!isReady) {
      throw new Error('Instagram container timed out');
    }

    // Step 3: Publish container
    const publishResponse = await axios.post(
      `${INSTAGRAM_API_BASE}/${account.accountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: account.accessToken,
      }
    );

    const postId = publishResponse.data.id;

    // Get permalink
    const postResponse = await axios.get(
      `${INSTAGRAM_API_BASE}/${postId}`,
      {
        params: {
          fields: 'permalink',
          access_token: account.accessToken,
        },
      }
    );

    logger.info(`Instagram post published: ${postId}`);

    return {
      id: postId,
      permalink: postResponse.data.permalink,
    };
  } catch (error: any) {
    logger.error('Instagram publish error:', error.response?.data || error.message);
    throw new Error(`Instagram publish failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

export async function getInstagramInsights(
  postId: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await axios.get(
      `${INSTAGRAM_API_BASE}/${postId}/insights`,
      {
        params: {
          metric: 'engagement,impressions,reach,saved,video_views',
          access_token: accessToken,
        },
      }
    );

    return response.data.data;
  } catch (error: any) {
    logger.error('Instagram insights error:', error.response?.data || error.message);
    return null;
  }
}
