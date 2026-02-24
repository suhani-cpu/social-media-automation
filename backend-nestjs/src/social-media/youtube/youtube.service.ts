import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Post, Video, SocialAccount } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { YouTubeOAuthService } from '../../oauth/services/youtube-oauth.service';
import { FfmpegService } from '../../video-processing/ffmpeg.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export type ProgressStage = 'downloading' | 'converting' | 'uploading' | 'done' | 'error';

export interface UploadProgress {
  stage: ProgressStage;
  percent: number;
  message: string;
}

export interface YouTubeUploadOptions {
  videoPath: string;
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

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly youtubeOAuth: YouTubeOAuthService,
    private readonly ffmpegService: FfmpegService,
  ) {}

  // ── Publish ───────────────────────────────────────────────────────────────

  /**
   * Publish post to YouTube.
   * Determines the correct video URL based on post type, builds metadata,
   * then delegates to uploadVideo.
   */
  async publishToYouTube(
    post: Post,
    video: Video,
    account: SocialAccount,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ id: string; url: string }> {
    this.logger.log('Publishing to YouTube', {
      postId: post.id,
      videoId: video.id,
      accountId: account.id,
      postType: post.postType,
    });

    try {
      // Determine which video URL to use based on post type
      let videoUrl: string | null = null;
      let isShort = false;

      if (post.postType === 'SHORT') {
        videoUrl = video.youtubeShortsUrl;
        isShort = true;
      } else if (post.postType === 'FEED') {
        videoUrl = video.youtubeSquareUrl;
      } else {
        videoUrl = video.youtubeVideoUrl;
      }

      // Fall back to raw video if platform-specific format not available
      if (!videoUrl) {
        videoUrl = video.rawVideoUrl;
        this.logger.warn(`No processed ${post.postType} URL found, falling back to rawVideoUrl`);
      }

      if (!videoUrl) {
        throw new Error(
          `No video file available for YouTube upload. Video status: ${video.status}`,
        );
      }

      // Build description from caption and hashtags
      let description = post.caption;
      if (post.hashtags && post.hashtags.length > 0) {
        description += '\n\n' + post.hashtags.join(' ');
      }

      // Extract tags from hashtags (remove # symbol)
      const tags = post.hashtags.map((tag) => tag.replace('#', '').trim());

      // Read privacy from post metadata (default: public)
      const metadata = post.metadata as Record<string, any> | null;
      const privacyStatus = (metadata?.privacyStatus || 'public') as 'public' | 'private' | 'unlisted';

      // Prepare upload options — title = video file name (Drive name)
      const uploadOptions: YouTubeUploadOptions = {
        videoPath: videoUrl,
        title: video.title || post.caption.substring(0, 100),
        description,
        tags,
        language: this.mapLanguageToYouTubeCode(post.language),
        privacyStatus,
        isShort,
        madeForKids: false,
      };

      // Upload to YouTube
      const result = await this.uploadVideo(
        uploadOptions.videoPath,
        uploadOptions,
        account,
        onProgress,
      );

      onProgress?.({ stage: 'done', percent: 100, message: 'Published successfully' });

      this.logger.log('Successfully published to YouTube', {
        postId: post.id,
        videoId: result.id,
        url: result.url,
        isShort,
        privacyStatus,
      });

      return {
        id: result.id,
        url: result.url,
      };
    } catch (error) {
      onProgress?.({ stage: 'error', percent: 0, message: error instanceof Error ? error.message : 'Upload failed' });

      this.logger.error('Failed to publish to YouTube:', {
        postId: post.id,
        videoId: video.id,
        accountId: account.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  /**
   * Upload a video file (local path or S3 URL) to YouTube.
   * Downloads from S3 when needed, handles temp-file cleanup, and performs
   * the resumable upload via the YouTube Data API v3.
   */
  async uploadVideo(
    filePath: string,
    metadata: YouTubeUploadOptions,
    account: SocialAccount,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<YouTubeUploadResult> {
    const {
      title,
      description,
      tags = [],
      categoryId = '22', // People & Blogs
      language = 'en',
      privacyStatus = 'public',
      isShort = false,
      madeForKids = false,
    } = metadata;

    let localVideoPath = filePath;
    let tempFile: string | null = null;
    let convertedFile: string | null = null;

    try {
      // ── Step 1: Download from S3/storage if URL ──────────────────────
      if (filePath.startsWith('http')) {
        const ext = path.extname(filePath) || '.mp4';
        tempFile = path.join(os.tmpdir(), `youtube-download-${Date.now()}${ext}`);

        onProgress?.({ stage: 'downloading', percent: 0, message: 'Downloading video from storage...' });

        this.logger.log('Downloading video from storage for YouTube upload', {
          videoPath: filePath,
          tempFile,
        });

        await this.storageService.download(filePath, tempFile);
        localVideoPath = tempFile;

        onProgress?.({ stage: 'downloading', percent: 100, message: 'Download complete' });
      }

      // Verify file exists
      if (!fs.existsSync(localVideoPath)) {
        throw new Error(`Video file not found: ${localVideoPath}`);
      }

      // ── Step 2: Convert to MP4 if needed ──────────────────────────────
      const fileExt = path.extname(localVideoPath).toLowerCase();
      if (fileExt && fileExt !== '.mp4') {
        onProgress?.({ stage: 'converting', percent: 0, message: `Converting ${fileExt} to MP4...` });

        this.logger.log('Converting video to MP4 for YouTube upload', { fileExt, localVideoPath });

        convertedFile = path.join(os.tmpdir(), `youtube-converted-${Date.now()}.mp4`);

        await this.convertToMp4(localVideoPath, convertedFile, (percent) => {
          onProgress?.({ stage: 'converting', percent, message: `Converting: ${Math.round(percent)}%` });
        });

        localVideoPath = convertedFile;
        onProgress?.({ stage: 'converting', percent: 100, message: 'Conversion complete' });
      }

      // ── Step 3: Upload to YouTube ─────────────────────────────────────
      const stats = fs.statSync(localVideoPath);
      const totalBytes = stats.size;

      onProgress?.({ stage: 'uploading', percent: 0, message: 'Starting YouTube upload...' });

      this.logger.log('Uploading video to YouTube', {
        accountId: account.id,
        title,
        fileSize: totalBytes,
        isShort,
        privacyStatus,
      });

      // Get authenticated client
      const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // Prepare video title (add #Shorts tag if it's a Short)
      let videoTitle = title;
      if (isShort && !title.toLowerCase().includes('#shorts')) {
        videoTitle = `#Shorts ${title}`;
      }

      // Prepare request body
      const requestBody = {
        snippet: {
          title: videoTitle.substring(0, 100),
          description: description.substring(0, 5000),
          tags: tags.slice(0, 500),
          categoryId,
          defaultLanguage: language,
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: madeForKids,
        },
      };

      this.logger.log('YouTube upload request prepared', {
        title: videoTitle,
        tags: tags.length,
        categoryId,
        privacyStatus,
      });

      // Create a progress-tracking read stream
      const readStream = fs.createReadStream(localVideoPath);
      let bytesRead = 0;

      readStream.on('data', (chunk: Buffer) => {
        bytesRead += chunk.length;
        const percent = totalBytes > 0 ? (bytesRead / totalBytes) * 100 : 0;
        onProgress?.({ stage: 'uploading', percent, message: `Uploading: ${Math.round(percent)}%` });
      });

      // Upload video using resumable upload
      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody,
        media: {
          body: readStream,
        },
      });

      const videoId = response.data.id!;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      this.logger.log('Video uploaded to YouTube successfully', {
        videoId,
        url: videoUrl,
        title: response.data.snippet?.title,
      });

      return {
        id: videoId,
        url: videoUrl,
        title: response.data.snippet?.title || videoTitle,
        description: response.data.snippet?.description || description,
        publishedAt:
          response.data.snippet?.publishedAt || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('YouTube upload failed:', {
        accountId: account.id,
        title,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new Error(
        `YouTube upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  // ── MP4 Conversion ─────────────────────────────────────────────────────────

  /**
   * Convert a video file to MP4 using FFmpeg (fast copy if possible, transcode if not).
   */
  private async convertToMp4(
    inputPath: string,
    outputPath: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    const ffmpeg = require('fluent-ffmpeg');

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-preset fast'])
        .format('mp4');

      command.on('progress', (progress: any) => {
        onProgress?.(progress.percent || 0);
      });

      command.on('end', () => {
        this.logger.log('MP4 conversion complete', { inputPath, outputPath });
        resolve();
      });

      command.on('error', (err: Error) => {
        this.logger.error('MP4 conversion failed', { error: err.message });
        reject(new Error(`MP4 conversion failed: ${err.message}`));
      });

      command.save(outputPath);
    });
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  /**
   * Fetch analytics (statistics + content details) for a single YouTube video.
   */
  async fetchAnalytics(
    account: SocialAccount,
    videoId: string,
  ): Promise<YouTubeAnalytics> {
    this.logger.log('Fetching YouTube insights', {
      videoId,
      accountId: account.id,
    });

    try {
      const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // Fetch video statistics
      const response = await youtube.videos.list({
        part: ['statistics', 'contentDetails'],
        id: [videoId],
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video ${videoId} not found`);
      }

      const videoData = response.data.items[0];
      const stats = videoData.statistics;
      const contentDetails = videoData.contentDetails;

      const analytics: YouTubeAnalytics = {
        views: parseInt(stats?.viewCount || '0'),
        likes: parseInt(stats?.likeCount || '0'),
        dislikes: parseInt(stats?.dislikeCount || '0'),
        comments: parseInt(stats?.commentCount || '0'),
        shares: 0, // Not available in basic API
        favorites: parseInt(stats?.favoriteCount || '0'),
        duration: contentDetails?.duration ?? undefined,
      };

      this.logger.log('YouTube analytics fetched', {
        videoId,
        views: analytics.views,
        likes: analytics.likes,
      });

      return analytics;
    } catch (error) {
      this.logger.error('Failed to fetch YouTube analytics:', {
        videoId,
        accountId: account.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch YouTube analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Detailed Analytics ────────────────────────────────────────────────────

  /**
   * Fetch detailed analytics via the YouTube Analytics API (v2).
   * Falls back to null when the additional OAuth scope is not available.
   */
  async fetchDetailedAnalytics(
    account: SocialAccount,
    videoId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
      const youtubeAnalytics = google.youtubeAnalytics({
        version: 'v2',
        auth: oauth2Client,
      });

      const response = await youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics:
          'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });

      this.logger.log('YouTube detailed analytics fetched', {
        videoId,
        rows: response.data.rows?.length || 0,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch YouTube detailed analytics:', {
        videoId,
        accountId: account.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fall back to basic analytics
      return null;
    }
  }

  // ── Channel Info ──────────────────────────────────────────────────────────

  /**
   * Retrieve the authenticated channel's snippet and statistics.
   */
  async getChannelInfo(account: SocialAccount): Promise<any> {
    try {
      const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      const response = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        mine: true,
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No channel found for this account');
      }

      const channel = response.data.items[0];

      this.logger.log('YouTube channel info fetched', {
        accountId: account.id,
        channelId: channel.id,
        title: channel.snippet?.title,
      });

      return {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        customUrl: channel.snippet?.customUrl,
        subscriberCount: parseInt(
          channel.statistics?.subscriberCount || '0',
        ),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        viewCount: parseInt(channel.statistics?.viewCount || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to fetch YouTube channel info:', {
        accountId: account.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to fetch channel info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ── Update / Delete ───────────────────────────────────────────────────────

  /**
   * Update metadata of an existing YouTube video.
   */
  async updateVideo(
    account: SocialAccount,
    videoId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
      privacyStatus?: 'public' | 'private' | 'unlisted';
    },
  ): Promise<void> {
    try {
      const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      const requestBody: any = { id: videoId };

      if (
        updates.title ||
        updates.description ||
        updates.tags ||
        updates.categoryId
      ) {
        requestBody.snippet = {};
        if (updates.title)
          requestBody.snippet.title = updates.title.substring(0, 100);
        if (updates.description)
          requestBody.snippet.description = updates.description.substring(
            0,
            5000,
          );
        if (updates.tags)
          requestBody.snippet.tags = updates.tags.slice(0, 500);
        if (updates.categoryId)
          requestBody.snippet.categoryId = updates.categoryId;
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

      this.logger.log('YouTube video updated', { videoId, updates });
    } catch (error) {
      this.logger.error('Failed to update YouTube video:', {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a video from YouTube.
   */
  async deleteVideo(account: SocialAccount, videoId: string): Promise<void> {
    try {
      const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      await youtube.videos.delete({ id: videoId });

      this.logger.log('YouTube video deleted', { videoId });
    } catch (error) {
      this.logger.error('Failed to delete YouTube video:', {
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
   * Map application language to YouTube language code.
   */
  private mapLanguageToYouTubeCode(language: string): string {
    const languageMap: Record<string, string> = {
      ENGLISH: 'en',
      HINDI: 'hi',
      HINGLISH: 'en',
      HARYANVI: 'hi',
      RAJASTHANI: 'hi',
      BHOJPURI: 'hi',
    };

    return languageMap[language] || 'en';
  }

  /**
   * Validate YouTube video URL format (11-character alphanumeric ID).
   */
  isValidYouTubeVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }

  /**
   * Extract video ID from a YouTube URL.
   */
  extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
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
