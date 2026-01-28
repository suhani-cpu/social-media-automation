import { google } from 'googleapis';
import fs from 'fs';
import { getYouTubeAuthClient } from '../../auth/youtube-oauth';
import { storage } from '../../storage';
import { logger } from '../../../utils/logger';
import path from 'path';
import os from 'os';

export interface YouTubeUploadOptions {
  videoPath: string; // Local path or S3 URL
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  language?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  isShort?: boolean;
  madeForKids?: boolean;
}

export interface YouTubeUploadResult {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt: string;
}

/**
 * Upload video to YouTube
 */
export async function uploadVideoToYouTube(
  accountId: string,
  options: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  const {
    videoPath,
    title,
    description,
    tags = [],
    categoryId = '22', // People & Blogs
    language = 'en',
    privacyStatus = 'public',
    isShort = false,
    madeForKids = false,
  } = options;

  let localVideoPath = videoPath;
  let tempFile: string | null = null;

  try {
    // Download from S3 if URL provided
    if (videoPath.startsWith('http')) {
      tempFile = path.join(os.tmpdir(), `youtube-upload-${Date.now()}.mp4`);
      logger.info('Downloading video from storage for YouTube upload', {
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

    // Get file size for logging
    const stats = fs.statSync(localVideoPath);
    logger.info('Uploading video to YouTube', {
      accountId,
      title,
      fileSize: stats.size,
      isShort,
    });

    // Get authenticated client
    const oauth2Client = await getYouTubeAuthClient(accountId);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Prepare video title (add #Shorts tag if it's a Short)
    let videoTitle = title;
    if (isShort && !title.toLowerCase().includes('#shorts')) {
      videoTitle = `#Shorts ${title}`;
    }

    // Prepare request body
    const requestBody = {
      snippet: {
        title: videoTitle.substring(0, 100), // YouTube limit: 100 characters
        description: description.substring(0, 5000), // YouTube limit: 5000 characters
        tags: tags.slice(0, 500), // YouTube limit: 500 tags
        categoryId,
        defaultLanguage: language,
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: madeForKids,
      },
    };

    logger.info('YouTube upload request prepared', {
      title: videoTitle,
      tags: tags.length,
      categoryId,
      privacyStatus,
    });

    // Upload video using resumable upload
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody,
      media: {
        body: fs.createReadStream(localVideoPath),
      },
    });

    const videoId = response.data.id!;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    logger.info('Video uploaded to YouTube successfully', {
      videoId,
      url: videoUrl,
      title: response.data.snippet?.title,
    });

    return {
      id: videoId,
      url: videoUrl,
      title: response.data.snippet?.title || videoTitle,
      description: response.data.snippet?.description || description,
      publishedAt: response.data.snippet?.publishedAt || new Date().toISOString(),
    };
  } catch (error) {
    logger.error('YouTube upload failed:', {
      accountId,
      title,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error(
      `YouTube upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
 * Update video metadata
 */
export async function updateYouTubeVideo(
  accountId: string,
  videoId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: 'public' | 'private' | 'unlisted';
  }
): Promise<void> {
  try {
    const oauth2Client = await getYouTubeAuthClient(accountId);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const requestBody: any = { id: videoId };

    if (updates.title || updates.description || updates.tags || updates.categoryId) {
      requestBody.snippet = {};
      if (updates.title) requestBody.snippet.title = updates.title.substring(0, 100);
      if (updates.description) requestBody.snippet.description = updates.description.substring(0, 5000);
      if (updates.tags) requestBody.snippet.tags = updates.tags.slice(0, 500);
      if (updates.categoryId) requestBody.snippet.categoryId = updates.categoryId;
    }

    if (updates.privacyStatus) {
      requestBody.status = {
        privacyStatus: updates.privacyStatus,
      };
    }

    await youtube.videos.update({
      part: Object.keys(requestBody).filter((k) => k !== 'id'),
      requestBody,
    });

    logger.info('YouTube video updated', { videoId, updates });
  } catch (error) {
    logger.error('Failed to update YouTube video:', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete video from YouTube
 */
export async function deleteYouTubeVideo(accountId: string, videoId: string): Promise<void> {
  try {
    const oauth2Client = await getYouTubeAuthClient(accountId);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.videos.delete({
      id: videoId,
    });

    logger.info('YouTube video deleted', { videoId });
  } catch (error) {
    logger.error('Failed to delete YouTube video:', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(
      `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
