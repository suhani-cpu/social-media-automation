import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Post, Video, SocialAccount } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { FacebookOAuthService } from '../../oauth/services/facebook-oauth.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface FacebookUploadOptions {
  videoPath: string;
  title: string;
  description: string;
  published?: boolean;
}

export interface FacebookUploadResult {
  id: string;
  permalink: string;
}

export interface FacebookAnalytics {
  views: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  avgWatchTime?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly facebookOAuth: FacebookOAuthService,
  ) {}

  // ── Publish ───────────────────────────────────────────────────────────────

  /**
   * Publish post to Facebook.
   * Selects the correct video URL (square for FEED, landscape for VIDEO),
   * builds metadata, then delegates to uploadVideo.
   */
  async publishToFacebook(
    post: Post,
    video: Video,
    account: SocialAccount,
  ): Promise<{ id: string; permalink: string }> {
    this.logger.log('Publishing to Facebook', {
      postId: post.id,
      videoId: video.id,
      accountId: account.id,
      postType: post.postType,
    });

    try {
      // Determine which video URL to use based on post type
      let videoUrl: string | null;

      if (post.postType === 'FEED') {
        videoUrl = video.facebookSquareUrl;
      } else {
        videoUrl = video.facebookLandscapeUrl;
      }

      // Fall back to raw video if platform-specific format not available
      if (!videoUrl) {
        videoUrl = video.rawVideoUrl;
        this.logger.warn(`No processed Facebook ${post.postType} URL found, falling back to rawVideoUrl`);
      }

      if (!videoUrl) {
        throw new Error(
          `No video file available for Facebook upload. Video status: ${video.status}`,
        );
      }

      // Build description from caption and hashtags
      let description = post.caption;
      if (post.hashtags && post.hashtags.length > 0) {
        description += '\n\n' + post.hashtags.join(' ');
      }

      const title = video.title || post.caption.substring(0, 100);

      // Ensure token is fresh before uploading
      const freshToken = await this.facebookOAuth.getValidAccessToken(account.id);
      const freshAccount = { ...account, accessToken: freshToken };

      // Upload to Facebook
      const result = await this.uploadVideo(
        videoUrl,
        title,
        description,
        freshAccount,
      );

      this.logger.log('Successfully published to Facebook', {
        postId: post.id,
        videoId: result.id,
        permalink: result.permalink,
      });

      return {
        id: result.id,
        permalink: result.permalink,
      };
    } catch (error) {
      this.logger.error('Failed to publish to Facebook:', {
        postId: post.id,
        videoId: video.id,
        accountId: account.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ── Upload Video ──────────────────────────────────────────────────────────

  /**
   * Upload video to a Facebook Page.
   * Downloads from S3 when the path is an HTTP URL, selects simple or
   * resumable upload based on the 25 MB threshold, and cleans up temp files.
   */
  async uploadVideo(
    filePath: string,
    title: string,
    description: string,
    account: SocialAccount,
    published = true,
  ): Promise<FacebookUploadResult> {
    let localVideoPath = filePath;
    let tempFile: string | null = null;
    let convertedFile: string | null = null;

    try {
      // Download from S3 if URL provided
      if (filePath.startsWith('http')) {
        tempFile = path.join(
          os.tmpdir(),
          `facebook-upload-${Date.now()}.mp4`,
        );
        this.logger.log(
          'Downloading video from storage for Facebook upload',
          { videoPath: filePath, tempFile },
        );

        await this.storageService.download(filePath, tempFile);
        localVideoPath = tempFile;
      }

      // Verify file exists
      if (!fs.existsSync(localVideoPath)) {
        throw new Error(`Video file not found: ${localVideoPath}`);
      }

      // Convert to MP4 if needed
      const fileExt = path.extname(localVideoPath).toLowerCase();
      if (fileExt && fileExt !== '.mp4') {
        this.logger.log('Converting video to MP4 for Facebook upload', { fileExt });
        convertedFile = path.join(os.tmpdir(), `fb-converted-${Date.now()}.mp4`);
        await new Promise<void>((resolve, reject) => {
          const ffmpeg = require('fluent-ffmpeg');
          ffmpeg(localVideoPath)
            .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-preset fast'])
            .format('mp4')
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .save(convertedFile);
        });
        localVideoPath = convertedFile;
      }

      const stats = fs.statSync(localVideoPath);
      const fileSize = stats.size;

      this.logger.log('Uploading video to Facebook', {
        pageId: account.accountId,
        title,
        fileSize,
      });

      // For files > 25 MB, use resumable upload
      if (fileSize > 25 * 1024 * 1024) {
        return await this.resumableUpload(
          account.accountId,
          account.accessToken,
          localVideoPath,
          title,
          description,
          published,
        );
      } else {
        return await this.simpleUpload(
          account.accountId,
          account.accessToken,
          localVideoPath,
          title,
          description,
          published,
        );
      }
    } catch (error) {
      this.logger.error('Facebook upload failed:', {
        pageId: account.accountId,
        title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Facebook upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      // Cleanup temp files
      for (const f of [tempFile, convertedFile]) {
        if (f && fs.existsSync(f)) {
          try {
            fs.unlinkSync(f);
            this.logger.log('Temp file cleaned up', { file: f });
          } catch (cleanupError) {
            this.logger.warn('Failed to cleanup temp file', { file: f, error: cleanupError });
          }
        }
      }
    }
  }

  // ── Simple Upload ─────────────────────────────────────────────────────────

  /**
   * Simple upload for smaller videos (< 25 MB).
   */
  private async simpleUpload(
    pageId: string,
    accessToken: string,
    videoPath: string,
    title: string,
    description: string,
    published: boolean,
  ): Promise<FacebookUploadResult> {
    try {
      this.logger.log('Using simple upload method (multipart)');

      const FormData = require('form-data');
      const form = new FormData();
      form.append('source', fs.createReadStream(videoPath));
      form.append('title', title);
      form.append('description', description);
      form.append('published', String(published));
      form.append('access_token', accessToken);

      const response = await axios.post(
        `${FACEBOOK_API_BASE}/${pageId}/videos`,
        form,
        { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity },
      );

      const videoId = response.data.id;
      const permalink = `https://www.facebook.com/${videoId}`;

      this.logger.log('Facebook video uploaded (simple)', { videoId });

      return { id: videoId, permalink };
    } catch (error) {
      this.logger.error('Simple upload failed:', error);
      throw error;
    }
  }

  // ── Resumable Upload ──────────────────────────────────────────────────────

  /**
   * Resumable upload for larger videos (> 25 MB).
   * Follows the three-phase Facebook upload protocol: start, transfer, finish.
   */
  private async resumableUpload(
    pageId: string,
    accessToken: string,
    videoPath: string,
    title: string,
    description: string,
    published: boolean,
  ): Promise<FacebookUploadResult> {
    try {
      this.logger.log('Using resumable upload method');

      const fileSize = fs.statSync(videoPath).size;

      // Step 1: Initialize upload session
      const initResponse = await axios.post(
        `${FACEBOOK_API_BASE}/${pageId}/videos`,
        {
          upload_phase: 'start',
          file_size: fileSize,
          access_token: accessToken,
        },
      );

      const uploadSessionId = initResponse.data.upload_session_id;
      const startOffset = initResponse.data.start_offset;
      const endOffset = initResponse.data.end_offset;

      this.logger.log('Upload session initialized', {
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
        },
      );

      this.logger.log('Video uploaded to Facebook');

      // Step 3: Finalize upload
      const finishResponse = await axios.post(
        `${FACEBOOK_API_BASE}/${pageId}/videos`,
        {
          upload_phase: 'finish',
          upload_session_id: uploadSessionId,
          title,
          description,
          published,
          access_token: accessToken,
        },
      );

      const success = finishResponse.data.success;

      if (!success) {
        throw new Error('Upload finalization failed');
      }

      this.logger.log('Upload finalized');

      const videoId = uploadSessionId;
      const permalink = `https://www.facebook.com/${pageId}/videos`;

      return { id: videoId, permalink };
    } catch (error) {
      this.logger.error('Resumable upload failed:', error);
      throw error;
    }
  }

  // ── Insights ──────────────────────────────────────────────────────────────

  /**
   * Fetch insights for a Facebook video (views, engagement, etc.).
   */
  async getInsights(
    account: SocialAccount,
    postId: string,
  ): Promise<FacebookAnalytics> {
    this.logger.log('Fetching Facebook insights', { videoId: postId });

    try {
      const accessToken = account.accessToken;

      // Get video insights
      const insightsResponse = await axios.get(
        `${FACEBOOK_API_BASE}/${postId}/video_insights`,
        {
          params: {
            metric: [
              'total_video_views',
              'total_video_views_unique',
              'total_video_avg_time_watched',
            ].join(','),
            access_token: accessToken,
          },
        },
      );

      // Get video engagement (likes, comments, shares)
      const videoResponse = await axios.get(
        `${FACEBOOK_API_BASE}/${postId}`,
        {
          params: {
            fields:
              'likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
            access_token: accessToken,
          },
        },
      );

      // Parse insights
      const insights = insightsResponse.data.data.reduce(
        (acc: any, metric: any) => {
          const name = metric.name;
          const value = metric.values[0]?.value || 0;
          acc[name] = value;
          return acc;
        },
        {},
      );

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

      this.logger.log('Facebook insights fetched', {
        videoId: postId,
        views: analytics.views,
        likes: analytics.likes,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to fetch Facebook insights:', {
        videoId: postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch Facebook insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Page Insights ─────────────────────────────────────────────────────────

  /**
   * Fetch page-level insights for a Facebook Page.
   */
  async getPageInsights(
    account: SocialAccount,
    period: 'day' | 'week' | 'days_28' = 'day',
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${account.accountId}/insights`,
        {
          params: {
            metric: [
              'page_views_total',
              'page_fans',
              'page_impressions',
              'page_video_views',
              'page_post_engagements',
            ].join(','),
            period,
            access_token: account.accessToken,
          },
        },
      );

      const insights = response.data.data.reduce(
        (acc: any, metric: any) => {
          acc[metric.name] = metric.values[0]?.value || 0;
          return acc;
        },
        {},
      );

      this.logger.log('Facebook page insights fetched', {
        pageId: account.accountId,
      });

      return insights;
    } catch (error) {
      this.logger.error('Failed to fetch Facebook page insights:', {
        pageId: account.accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch page insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Video Details ─────────────────────────────────────────────────────────

  /**
   * Retrieve detailed fields for a Facebook video.
   */
  async getVideoDetails(
    account: SocialAccount,
    videoId: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${videoId}`,
        {
          params: {
            fields:
              'id,title,description,created_time,length,permalink_url,picture',
            access_token: account.accessToken,
          },
        },
      );

      this.logger.log('Facebook video details fetched', { videoId });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Facebook video details:', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch video details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Update / Delete ───────────────────────────────────────────────────────

  /**
   * Update metadata of an existing Facebook video.
   */
  async updateVideo(
    account: SocialAccount,
    videoId: string,
    updates: {
      title?: string;
      description?: string;
      published?: boolean;
    },
  ): Promise<void> {
    try {
      await axios.post(`${FACEBOOK_API_BASE}/${videoId}`, {
        ...updates,
        access_token: account.accessToken,
      });

      this.logger.log('Facebook video updated', { videoId, updates });
    } catch (error) {
      this.logger.error('Failed to update Facebook video:', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a video from Facebook.
   */
  async deleteVideo(
    account: SocialAccount,
    videoId: string,
  ): Promise<void> {
    try {
      await axios.delete(`${FACEBOOK_API_BASE}/${videoId}`, {
        params: {
          access_token: account.accessToken,
        },
      });

      this.logger.log('Facebook video deleted', { videoId });
    } catch (error) {
      this.logger.error('Failed to delete Facebook video:', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Validate Facebook video ID format (numeric).
   */
  isValidFacebookVideoId(videoId: string): boolean {
    return /^\d+$/.test(videoId);
  }

  /**
   * Extract video ID from a Facebook URL.
   */
  extractFacebookVideoId(url: string): string | null {
    const patterns = [
      /facebook\.com\/.*\/videos\/(\d+)/,
      /facebook\.com\/watch\/\?v=(\d+)/,
      /fb\.watch\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}
