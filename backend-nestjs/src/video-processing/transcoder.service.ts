import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FfmpegService } from './ffmpeg.service';
import { ThumbnailService } from './thumbnail.service';
import { FORMATS, getAllFormatNames, VIDEO_URL_FIELDS } from './formats';

export interface ProcessVideoOptions {
  videoId: string;
  onProgress?: (stage: string, progress: number) => void;
}

@Injectable()
export class TranscoderService {
  private readonly logger = new Logger(TranscoderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ffmpegService: FfmpegService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  /**
   * Main video processing workflow
   * 1. Download/locate raw video
   * 2. Validate video
   * 3. Get metadata
   * 4. Transcode to all platform formats
   * 5. Generate thumbnails
   * 6. Upload all files to storage
   * 7. Update database with URLs
   * 8. Cleanup temp files
   */
  async processVideo(options: ProcessVideoOptions): Promise<void> {
    const { videoId, onProgress } = options;

    this.logger.log('Starting video processing workflow', { videoId });

    // Create temp directory for processing
    const tempDir = path.join(os.tmpdir(), 'video-processing', videoId);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // 1. Fetch video record
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new Error(`Video ${videoId} not found`);
      }

      this.logger.log('Video record fetched', {
        videoId,
        status: video.status,
        rawVideoUrl: video.rawVideoUrl,
      });

      // 2. Get raw video path
      let rawVideoPath: string;

      if (video.rawVideoUrl?.startsWith('file://')) {
        // Local file
        rawVideoPath = video.rawVideoUrl.replace('file://', '');
      } else if (video.rawVideoUrl?.startsWith('http')) {
        // Download from S3 or URL
        rawVideoPath = path.join(tempDir, 'raw-video.mp4');
        await this.storage.download(video.rawVideoUrl, rawVideoPath);
      } else {
        // Assume it's a local path
        rawVideoPath = video.rawVideoUrl || '';
      }

      if (!rawVideoPath) {
        throw new Error('Raw video path is empty');
      }

      this.logger.log('Raw video located', { rawVideoPath });
      onProgress?.('validation', 10);

      // 3. Validate video
      await this.ffmpegService.validateVideo(rawVideoPath);
      this.logger.log('Video validation passed');
      onProgress?.('validation', 20);

      // 4. Get video metadata
      const metadata =
        await this.ffmpegService.getVideoMetadata(rawVideoPath);
      this.logger.log('Video metadata extracted', {
        duration: metadata.duration,
        resolution: `${metadata.width}x${metadata.height}`,
      });

      // Update video with metadata
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          duration: Math.round(metadata.duration),
          fileSize: metadata.size,
        },
      });

      onProgress?.('metadata', 25);

      // 5. Transcode to all formats
      const formatNames = getAllFormatNames();
      const processedVideos: Record<string, string> = {};

      for (let i = 0; i < formatNames.length; i++) {
        const formatName = formatNames[i];
        const format = FORMATS[formatName];

        this.logger.log(`Transcoding to ${format.name}`, {
          format: formatName,
          progress: `${i + 1}/${formatNames.length}`,
        });

        const outputFilename = `${formatName.toLowerCase()}.mp4`;
        const outputPath = path.join(tempDir, outputFilename);

        // Transcode
        await this.ffmpegService.transcodeVideo({
          inputPath: rawVideoPath,
          outputPath,
          format,
          onProgress: (percent) => {
            const overallProgress =
              25 + ((i + percent / 100) / formatNames.length) * 50;
            onProgress?.('transcoding', overallProgress);
          },
        });

        // Upload to storage
        const s3Path = `videos/processed/${video.userId}/${videoId}/${outputFilename}`;
        const url = await this.storage.upload(outputPath, s3Path);

        processedVideos[formatName] = url;

        this.logger.log(`Uploaded ${format.name}`, {
          format: formatName,
          url,
        });

        // Clean up local file
        await fs.unlink(outputPath);
      }

      onProgress?.('transcoding', 75);

      // 6. Generate thumbnails
      this.logger.log('Generating thumbnails');

      const thumbnailDir = path.join(tempDir, 'thumbnails');
      const thumbnails =
        await this.thumbnailService.generateStandardThumbnails(
          rawVideoPath,
          thumbnailDir,
        );

      onProgress?.('thumbnails', 80);

      // 7. Upload thumbnails
      const thumbnailUrls: string[] = [];

      for (const thumbnail of thumbnails) {
        const s3Path = `videos/thumbnails/${video.userId}/${videoId}/${thumbnail.filename}`;
        const url = await this.storage.upload(thumbnail.path, s3Path);

        thumbnailUrls.push(url);

        this.logger.log('Thumbnail uploaded', {
          filename: thumbnail.filename,
          url,
        });
      }

      onProgress?.('thumbnails', 85);

      // 8. Upload raw video to persistent storage (if not already there)
      let rawVideoUrl = video.rawVideoUrl;

      if (
        rawVideoUrl?.startsWith('file://') ||
        !rawVideoUrl?.startsWith('http')
      ) {
        const s3Path = `videos/raw/${video.userId}/${videoId}/original.mp4`;
        rawVideoUrl = await this.storage.upload(rawVideoPath, s3Path);

        this.logger.log('Raw video uploaded to persistent storage', {
          rawVideoUrl,
        });
      }

      onProgress?.('upload', 90);

      // 9. Update database with all URLs
      const updateData: any = {
        status: 'READY',
        rawVideoUrl,
        thumbnailUrl: thumbnailUrls[0], // Use first thumbnail as primary
      };

      // Map format URLs to database fields
      for (const [formatName, url] of Object.entries(processedVideos)) {
        const fieldName = VIDEO_URL_FIELDS[formatName];
        if (fieldName) {
          updateData[fieldName] = url;
        }
      }

      await this.prisma.video.update({
        where: { id: videoId },
        data: updateData,
      });

      this.logger.log('Database updated with URLs', {
        videoId,
        processedFormats: formatNames.length,
        thumbnails: thumbnailUrls.length,
      });

      onProgress?.('complete', 100);

      this.logger.log('Video processing workflow completed successfully', {
        videoId,
      });
    } catch (error) {
      this.logger.error('Video processing failed', {
        videoId,
        error:
          error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Update video status to FAILED
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'FAILED',
          metadata: {
            error:
              error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString(),
          },
        },
      });

      throw error;
    } finally {
      // 10. Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        this.logger.log('Temp directory cleaned up', { tempDir });
      } catch (error) {
        this.logger.warn('Failed to cleanup temp directory', {
          tempDir,
          error:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}
