import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Post, Video, SocialAccount } from '@prisma/client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FfmpegService } from '../../video-processing/ffmpeg.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { InstagramOAuthService } from '../../oauth/services/instagram-oauth.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface InstagramUploadOptions {
  videoPath: string;
  caption: string;
  shareToFeed?: boolean;
  coverUrl?: string;
}

export interface InstagramUploadResult {
  id: string;
  permalink: string;
}

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

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly instagramOAuth: InstagramOAuthService,
    private readonly ffmpegService: FfmpegService,
  ) {}

  // ── Publish ───────────────────────────────────────────────────────────────

  /**
   * Publish post to Instagram.
   * Selects the correct video URL (Reel vs Feed), enforces the 2,200-character
   * caption limit, then delegates to uploadVideo.
   */
  async publishToInstagram(
    post: Post,
    video: Video,
    account: SocialAccount,
  ): Promise<{ id: string; permalink: string }> {
    this.logger.log('Publishing to Instagram', {
      postId: post.id,
      videoId: video.id,
      accountId: account.id,
      postType: post.postType,
    });

    try {
      // Determine which video URL to use based on post type
      let videoUrl: string | null;

      if (post.postType === 'REEL') {
        videoUrl = video.instagramReelUrl;
      } else {
        videoUrl = video.instagramFeedUrl;
      }

      // Fall back to raw video if platform-specific format not available
      if (!videoUrl) {
        videoUrl = video.rawVideoUrl;
        this.logger.warn(`No processed Instagram ${post.postType} URL found, falling back to rawVideoUrl`);
      }

      if (!videoUrl) {
        throw new Error(
          `No video file available for Instagram upload. Video status: ${video.status}`,
        );
      }

      // Build caption from post caption and hashtags
      let caption = post.caption;
      if (post.hashtags && post.hashtags.length > 0) {
        caption += '\n\n' + post.hashtags.join(' ');
      }

      // Instagram has a 2,200 character limit for captions
      if (caption.length > 2200) {
        caption = caption.substring(0, 2197) + '...';
      }

      // If video is not MP4, download and convert before uploading
      let finalVideoUrl = videoUrl;
      let tempFile: string | null = null;
      let convertedFile: string | null = null;

      try {
        const ext = path.extname(videoUrl).split('?')[0].toLowerCase();
        if (ext && ext !== '.mp4' && videoUrl.startsWith('http')) {
          this.logger.log('Non-MP4 video detected for Instagram, converting...', { ext });

          tempFile = path.join(os.tmpdir(), `ig-download-${Date.now()}${ext}`);
          convertedFile = path.join(os.tmpdir(), `ig-converted-${Date.now()}.mp4`);

          await this.storageService.download(videoUrl, tempFile);

          await new Promise<void>((resolve, reject) => {
            const ffmpeg = require('fluent-ffmpeg');
            ffmpeg(tempFile)
              .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-preset fast'])
              .format('mp4')
              .on('end', () => resolve())
              .on('error', (err: Error) => reject(err))
              .save(convertedFile);
          });

          // Upload converted file to S3 and get signed URL
          const s3Key = `converted/ig-${Date.now()}.mp4`;
          await this.storageService.upload(convertedFile, s3Key);
          finalVideoUrl = await this.storageService.getSignedUrl(s3Key, 3600);
        }

        // Ensure token is fresh before uploading
        const freshToken = await this.instagramOAuth.getValidAccessToken(account.id);
        const freshAccount = { ...account, accessToken: freshToken };

        // Upload to Instagram
        const result = await this.uploadVideo(finalVideoUrl, caption, freshAccount);

        this.logger.log('Successfully published to Instagram', {
          postId: post.id,
          mediaId: result.id,
          permalink: result.permalink,
        });

        return {
          id: result.id,
          permalink: result.permalink,
        };
      } finally {
        // Clean up temp files
        for (const f of [tempFile, convertedFile]) {
          if (f && fs.existsSync(f)) {
            try { fs.unlinkSync(f); } catch {}
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to publish to Instagram:', {
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
   * Upload video to Instagram as a Reel.
   *
   * Instagram Content Publishing API flow:
   *  1. Create media container with a publicly accessible video URL
   *  2. Poll container status until processing finishes
   *  3. Publish the container
   *  4. Retrieve the permalink
   */
  async uploadVideo(
    videoUrl: string,
    caption: string,
    account: SocialAccount,
  ): Promise<InstagramUploadResult> {
    let resolvedUrl = videoUrl;
    let tempFile: string | null = null;

    try {
      // If it's a local file, obtain a publicly accessible signed URL
      if (!videoUrl.startsWith('http')) {
        tempFile = path.join(
          os.tmpdir(),
          `instagram-upload-${Date.now()}.mp4`,
        );
        const publicUrl = await this.storageService.getSignedUrl(
          videoUrl,
          3600,
        );
        resolvedUrl = publicUrl;
      }

      const instagramAccountId = account.accountId;
      const accessToken = account.accessToken;

      this.logger.log('Creating Instagram media container', {
        instagramAccountId,
        videoUrl: resolvedUrl,
      });

      // Step 1: Create media container
      const createParams: any = {
        media_type: 'REELS',
        video_url: resolvedUrl,
        caption,
        share_to_feed: true,
        access_token: accessToken,
      };

      const createResponse = await axios.post(
        `${FACEBOOK_API_BASE}/${instagramAccountId}/media`,
        null,
        { params: createParams },
      );

      const containerId = createResponse.data.id;

      this.logger.log('Media container created', { containerId });

      // Step 2: Check container status (wait for processing)
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 30; // Up to 5 minutes (30 x 10 s)

      while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000));

        const statusResponse = await axios.get(
          `${FACEBOOK_API_BASE}/${containerId}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken,
            },
          },
        );

        status = statusResponse.data.status_code;
        attempts++;

        this.logger.log('Checking container status', {
          containerId,
          status,
          attempt: attempts,
        });

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(
            `Media processing failed with status: ${status}`,
          );
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
        },
      );

      const mediaId = publishResponse.data.id;

      this.logger.log('Media published to Instagram', { mediaId });

      // Get permalink
      const mediaResponse = await axios.get(
        `${FACEBOOK_API_BASE}/${mediaId}`,
        {
          params: {
            fields: 'id,permalink',
            access_token: accessToken,
          },
        },
      );

      const permalink = mediaResponse.data.permalink;

      this.logger.log('Instagram upload complete', { mediaId, permalink });

      return { id: mediaId, permalink };
    } catch (error) {
      this.logger.error('Instagram upload failed:', {
        instagramAccountId: account.accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Instagram upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      if (tempFile && fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
          this.logger.log('Temp file cleaned up', { tempFile });
        } catch (cleanupError) {
          this.logger.warn('Failed to cleanup temp file', {
            tempFile,
            error: cleanupError,
          });
        }
      }
    }
  }

  // ── Upload Photo ──────────────────────────────────────────────────────────

  /**
   * Upload a photo to Instagram Feed.
   */
  async uploadPhoto(
    imageUrl: string,
    caption: string,
    account: SocialAccount,
  ): Promise<InstagramUploadResult> {
    const instagramAccountId = account.accountId;
    const accessToken = account.accessToken;

    try {
      this.logger.log('Creating Instagram photo container', {
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
            caption,
            access_token: accessToken,
          },
        },
      );

      const containerId = createResponse.data.id;

      this.logger.log('Photo container created', { containerId });

      // Step 2: Publish the container
      const publishResponse = await axios.post(
        `${FACEBOOK_API_BASE}/${instagramAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        },
      );

      const mediaId = publishResponse.data.id;

      // Get permalink
      const mediaResponse = await axios.get(
        `${FACEBOOK_API_BASE}/${mediaId}`,
        {
          params: {
            fields: 'id,permalink',
            access_token: accessToken,
          },
        },
      );

      const permalink = mediaResponse.data.permalink;

      this.logger.log('Instagram photo upload complete', {
        mediaId,
        permalink,
      });

      return { id: mediaId, permalink };
    } catch (error) {
      this.logger.error('Instagram photo upload failed:', error);
      throw new Error(
        `Instagram photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  /**
   * Fetch insights for a single Instagram media object.
   */
  async fetchAnalytics(
    account: SocialAccount,
    mediaId: string,
  ): Promise<InstagramAnalytics> {
    this.logger.log('Fetching Instagram insights', { mediaId });

    try {
      const accessToken = account.accessToken;

      const metrics = [
        'impressions',
        'reach',
        'likes',
        'comments',
        'shares',
        'saves',
        'video_views',
      ];

      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${mediaId}/insights`,
        {
          params: {
            metric: metrics.join(','),
            access_token: accessToken,
          },
        },
      );

      const data = response.data.data;

      // Parse metrics from response
      const analytics: InstagramAnalytics = {
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
        const totalEngagements =
          analytics.likes +
          analytics.comments +
          analytics.shares +
          analytics.saves;
        analytics.engagement = (totalEngagements / analytics.reach) * 100;
      }

      this.logger.log('Instagram insights fetched', {
        mediaId,
        views: analytics.views,
        likes: analytics.likes,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram insights:', {
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Account Insights ──────────────────────────────────────────────────────

  /**
   * Fetch profile-level insights for an Instagram Business account.
   */
  async fetchAccountInsights(
    account: SocialAccount,
    period: 'day' | 'week' | 'days_28' = 'day',
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

      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${account.accountId}/insights`,
        {
          params: {
            metric: metrics.join(','),
            period,
            access_token: account.accessToken,
          },
        },
      );

      this.logger.log('Instagram account insights fetched', {
        instagramAccountId: account.accountId,
        period,
      });

      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram account insights:', {
        instagramAccountId: account.accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch account insights: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Media Details ─────────────────────────────────────────────────────────

  /**
   * Retrieve detailed fields for an Instagram media object.
   */
  async getMediaDetails(
    account: SocialAccount,
    mediaId: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${FACEBOOK_API_BASE}/${mediaId}`,
        {
          params: {
            fields:
              'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
            access_token: account.accessToken,
          },
        },
      );

      this.logger.log('Instagram media details fetched', { mediaId });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram media details:', {
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch media details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  /**
   * Delete a media object from Instagram.
   */
  async deleteMedia(
    account: SocialAccount,
    mediaId: string,
  ): Promise<void> {
    try {
      await axios.delete(`${FACEBOOK_API_BASE}/${mediaId}`, {
        params: {
          access_token: account.accessToken,
        },
      });

      this.logger.log('Instagram media deleted', { mediaId });
    } catch (error) {
      this.logger.error('Failed to delete Instagram media:', {
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Validate Instagram media ID format.
   */
  isValidInstagramMediaId(mediaId: string): boolean {
    return /^\d+_\d+$/.test(mediaId) || /^\d+$/.test(mediaId);
  }

  /**
   * Extract media ID from an Instagram URL.
   */
  extractInstagramMediaId(url: string): string | null {
    const patterns = [
      /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
      /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
      /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
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
