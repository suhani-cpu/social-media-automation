import axios from 'axios';
import fs from 'fs';
import { storage } from '../../storage';
import { logger } from '../../../utils/logger';
import path from 'path';
import os from 'os';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

export interface FacebookUploadOptions {
  videoPath: string; // Local path or S3 URL
  title: string;
  description: string;
  published?: boolean;
}

export interface FacebookUploadResult {
  id: string;
  permalink: string;
}

/**
 * Upload video to Facebook Page
 * Uses resumable upload for videos > 25MB
 */
export async function uploadVideoToFacebook(
  pageId: string,
  accessToken: string,
  options: FacebookUploadOptions
): Promise<FacebookUploadResult> {
  const { videoPath, title, description, published = true } = options;

  let localVideoPath = videoPath;
  let tempFile: string | null = null;

  try {
    // Download from S3 if URL provided
    if (videoPath.startsWith('http')) {
      tempFile = path.join(os.tmpdir(), `facebook-upload-${Date.now()}.mp4`);
      logger.info('Downloading video from storage for Facebook upload', {
        videoPath,
        tempFile,
      });

      await storage.download(videoPath, tempFile);
      localVideoPath = tempFile;
    }

    // Verify file exists
    if (!fs.existsSync(localVideoPath)) {
      throw new Error(`Video file not found: ${localVideoPath}`);
    }

    const stats = fs.statSync(localVideoPath);
    const fileSize = stats.size;

    logger.info('Uploading video to Facebook', {
      pageId,
      title,
      fileSize,
    });

    // For files > 25MB, use resumable upload
    if (fileSize > 25 * 1024 * 1024) {
      return await resumableUpload(pageId, accessToken, localVideoPath, title, description, published);
    } else {
      return await simpleUpload(pageId, accessToken, localVideoPath, title, description, published);
    }
  } catch (error) {
    logger.error('Facebook upload failed:', {
      pageId,
      title,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Facebook upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    // Cleanup temp file
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
 * Simple upload for smaller videos (< 25MB)
 */
async function simpleUpload(
  pageId: string,
  accessToken: string,
  videoPath: string,
  title: string,
  description: string,
  published: boolean
): Promise<FacebookUploadResult> {
  try {
    logger.info('Using simple upload method');

    // Get signed URL from S3
    const signedUrl = await storage.getSignedUrl(videoPath, 3600);

    const response = await axios.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, {
      file_url: signedUrl,
      title,
      description,
      published,
      access_token: accessToken,
    });

    const videoId = response.data.id;
    const permalink = `https://www.facebook.com/${videoId}`;

    logger.info('Facebook video uploaded (simple)', { videoId });

    return {
      id: videoId,
      permalink,
    };
  } catch (error) {
    logger.error('Simple upload failed:', error);
    throw error;
  }
}

/**
 * Resumable upload for larger videos (> 25MB)
 */
async function resumableUpload(
  pageId: string,
  accessToken: string,
  videoPath: string,
  title: string,
  description: string,
  published: boolean
): Promise<FacebookUploadResult> {
  try {
    logger.info('Using resumable upload method');

    const fileSize = fs.statSync(videoPath).size;

    // Step 1: Initialize upload session
    const initResponse = await axios.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, {
      upload_phase: 'start',
      file_size: fileSize,
      access_token: accessToken,
    });

    const uploadSessionId = initResponse.data.upload_session_id;
    const startOffset = initResponse.data.start_offset;
    const endOffset = initResponse.data.end_offset;

    logger.info('Upload session initialized', {
      uploadSessionId,
      startOffset,
      endOffset,
    });

    // Step 2: Upload video file
    const fileStream = fs.createReadStream(videoPath, {
      start: startOffset,
      end: endOffset - 1,
    });

    await axios.post(
      `${FACEBOOK_API_BASE}/${pageId}/videos`,
      {
        upload_phase: 'transfer',
        upload_session_id: uploadSessionId,
        start_offset: startOffset,
        video_file_chunk: fileStream,
        access_token: accessToken,
      },
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    logger.info('Video uploaded to Facebook');

    // Step 3: Finalize upload
    const finishResponse = await axios.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, {
      upload_phase: 'finish',
      upload_session_id: uploadSessionId,
      title,
      description,
      published,
      access_token: accessToken,
    });

    const success = finishResponse.data.success;

    if (!success) {
      throw new Error('Upload finalization failed');
    }

    logger.info('Upload finalized');

    // Step 4: Get video ID
    // Facebook returns video ID in a separate call after processing
    // For now, return the upload session ID as placeholder
    const videoId = uploadSessionId;
    const permalink = `https://www.facebook.com/${pageId}/videos`;

    return {
      id: videoId,
      permalink,
    };
  } catch (error) {
    logger.error('Resumable upload failed:', error);
    throw error;
  }
}

/**
 * Update video metadata
 */
export async function updateFacebookVideo(
  videoId: string,
  accessToken: string,
  updates: {
    title?: string;
    description?: string;
    published?: boolean;
  }
): Promise<void> {
  try {
    await axios.post(`${FACEBOOK_API_BASE}/${videoId}`, {
      ...updates,
      access_token: accessToken,
    });

    logger.info('Facebook video updated', { videoId, updates });
  } catch (error) {
    logger.error('Failed to update Facebook video:', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete video from Facebook
 */
export async function deleteFacebookVideo(
  videoId: string,
  accessToken: string
): Promise<void> {
  try {
    await axios.delete(`${FACEBOOK_API_BASE}/${videoId}`, {
      params: {
        access_token: accessToken,
      },
    });

    logger.info('Facebook video deleted', { videoId });
  } catch (error) {
    logger.error('Failed to delete Facebook video:', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
