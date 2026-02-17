import axios from 'axios';
import fs from 'fs';
import { storage } from '../../storage';
import { logger } from '../../../utils/logger';
import path from 'path';
import os from 'os';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramUploadOptions {
  videoPath: string; // Local path or S3 URL
  caption: string;
  shareToFeed?: boolean; // For Reels
  coverUrl?: string; // Thumbnail for video
}

export interface InstagramUploadResult {
  id: string;
  permalink: string;
}

/**
 * Publish video to Instagram as Reel or Feed Post
 * Instagram Content Publishing API flow:
 * 1. Upload video to Instagram (create container)
 * 2. Wait for processing
 * 3. Publish the container
 */
export async function uploadVideoToInstagram(
  instagramAccountId: string,
  accessToken: string,
  options: InstagramUploadOptions
): Promise<InstagramUploadResult> {
  const { videoPath, caption, shareToFeed = true, coverUrl } = options;

  let videoUrl = videoPath;
  let tempFile: string | null = null;

  try {
    // If it's a local file, we need to upload it to accessible storage first
    if (!videoPath.startsWith('http')) {
      // Instagram requires a publicly accessible URL
      tempFile = path.join(os.tmpdir(), `instagram-upload-${Date.now()}.mp4`);

      // For now, assume video is already accessible or upload to S3
      const publicUrl = await storage.getSignedUrl(videoPath, 3600); // 1 hour expiry
      videoUrl = publicUrl;
    }

    logger.info('Creating Instagram media container', {
      instagramAccountId,
      videoUrl,
    });

    // Step 1: Create media container
    const createParams: any = {
      media_type: 'REELS', // Use REELS for video posts
      video_url: videoUrl,
      caption: caption,
      share_to_feed: shareToFeed,
      access_token: accessToken,
    };

    if (coverUrl) {
      createParams.cover_url = coverUrl;
    }

    const createResponse = await axios.post(
      `${FACEBOOK_API_BASE}/${instagramAccountId}/media`,
      null,
      { params: createParams }
    );

    const containerId = createResponse.data.id;

    logger.info('Media container created', { containerId });

    // Step 2: Check container status (wait for processing)
    let status = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 5 minutes (30 attempts x 10 seconds)

    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

      const statusResponse = await axios.get(`${FACEBOOK_API_BASE}/${containerId}`, {
        params: {
          fields: 'status_code',
          access_token: accessToken,
        },
      });

      status = statusResponse.data.status_code;
      attempts++;

      logger.info('Checking container status', {
        containerId,
        status,
        attempt: attempts,
      });

      if (status === 'ERROR' || status === 'EXPIRED') {
        throw new Error(`Media processing failed with status: ${status}`);
      }
    }

    if (status !== 'FINISHED') {
      throw new Error(`Media processing timed out. Status: ${status}`);
    }

    // Step 3: Publish the container
    const publishResponse = await axios.post(
      `${FACEBOOK_API_BASE}/${instagramAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
    );

    const mediaId = publishResponse.data.id;

    logger.info('Media published to Instagram', { mediaId });

    // Get permalink
    const mediaResponse = await axios.get(`${FACEBOOK_API_BASE}/${mediaId}`, {
      params: {
        fields: 'id,permalink',
        access_token: accessToken,
      },
    });

    const permalink = mediaResponse.data.permalink;

    logger.info('Instagram upload complete', { mediaId, permalink });

    return {
      id: mediaId,
      permalink,
    };
  } catch (error) {
    logger.error('Instagram upload failed:', {
      instagramAccountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Instagram upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    // Cleanup temp file if created
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
        logger.info('Temp file cleaned up', { tempFile });
      } catch (error) {
        logger.warn('Failed to cleanup temp file', { tempFile, error });
      }
    }
  }
}

/**
 * Upload photo to Instagram Feed
 */
export async function uploadPhotoToInstagram(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<InstagramUploadResult> {
  try {
    logger.info('Creating Instagram photo container', {
      instagramAccountId,
      imageUrl,
    });

    // Step 1: Create media container
    const createResponse = await axios.post(
      `${FACEBOOK_API_BASE}/${instagramAccountId}/media`,
      null,
      {
        params: {
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken,
        },
      }
    );

    const containerId = createResponse.data.id;

    logger.info('Photo container created', { containerId });

    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `${FACEBOOK_API_BASE}/${instagramAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
    );

    const mediaId = publishResponse.data.id;

    // Get permalink
    const mediaResponse = await axios.get(`${FACEBOOK_API_BASE}/${mediaId}`, {
      params: {
        fields: 'id,permalink',
        access_token: accessToken,
      },
    });

    const permalink = mediaResponse.data.permalink;

    logger.info('Instagram photo upload complete', { mediaId, permalink });

    return {
      id: mediaId,
      permalink,
    };
  } catch (error) {
    logger.error('Instagram photo upload failed:', error);
    throw new Error(
      `Instagram photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete media from Instagram
 */
export async function deleteInstagramMedia(
  mediaId: string,
  accessToken: string
): Promise<void> {
  try {
    await axios.delete(`${FACEBOOK_API_BASE}/${mediaId}`, {
      params: {
        access_token: accessToken,
      },
    });

    logger.info('Instagram media deleted', { mediaId });
  } catch (error) {
    logger.error('Failed to delete Instagram media:', {
      mediaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
