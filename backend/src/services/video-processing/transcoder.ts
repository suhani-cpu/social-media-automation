import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { storage } from '../storage';
import { validateVideo, getVideoMetadata, transcodeVideo } from './ffmpeg';
import { generateStandardThumbnails } from './thumbnail';
import { FORMATS, getAllFormatNames, VIDEO_URL_FIELDS } from './formats';

export interface ProcessVideoOptions {
  videoId: string;
  onProgress?: (stage: string, progress: number) => void;
}

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
export async function processVideo(options: ProcessVideoOptions): Promise<void> {
  const { videoId, onProgress } = options;

  logger.info('Starting video processing workflow', { videoId });

  // Create temp directory for processing
  const tempDir = path.join(os.tmpdir(), 'video-processing', videoId);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 1. Fetch video record
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    logger.info('Video record fetched', {
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
      await storage.download(video.rawVideoUrl, rawVideoPath);
    } else {
      // Assume it's a local path
      rawVideoPath = video.rawVideoUrl || '';
    }

    if (!rawVideoPath) {
      throw new Error('Raw video path is empty');
    }

    logger.info('Raw video located', { rawVideoPath });
    onProgress?.('validation', 10);

    // 3. Validate video
    await validateVideo(rawVideoPath);
    logger.info('Video validation passed');
    onProgress?.('validation', 20);

    // 4. Get video metadata
    const metadata = await getVideoMetadata(rawVideoPath);
    logger.info('Video metadata extracted', {
      duration: metadata.duration,
      resolution: `${metadata.width}x${metadata.height}`,
    });

    // Update video with metadata
    await prisma.video.update({
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

      logger.info(`Transcoding to ${format.name}`, {
        format: formatName,
        progress: `${i + 1}/${formatNames.length}`,
      });

      const outputFilename = `${formatName.toLowerCase()}.mp4`;
      const outputPath = path.join(tempDir, outputFilename);

      // Transcode
      await transcodeVideo({
        inputPath: rawVideoPath,
        outputPath,
        format,
        onProgress: (percent) => {
          const overallProgress = 25 + ((i + percent / 100) / formatNames.length) * 50;
          onProgress?.('transcoding', overallProgress);
        },
      });

      // Upload to storage
      const s3Path = `videos/processed/${video.userId}/${videoId}/${outputFilename}`;
      const url = await storage.upload(outputPath, s3Path, {
        contentType: 'video/mp4',
        metadata: {
          videoId,
          userId: video.userId,
          format: formatName,
        },
      });

      processedVideos[formatName] = url;

      logger.info(`Uploaded ${format.name}`, {
        format: formatName,
        url,
      });

      // Clean up local file
      await fs.unlink(outputPath);
    }

    onProgress?.('transcoding', 75);

    // 6. Generate thumbnails
    logger.info('Generating thumbnails');

    const thumbnailDir = path.join(tempDir, 'thumbnails');
    const thumbnails = await generateStandardThumbnails(rawVideoPath, thumbnailDir);

    onProgress?.('thumbnails', 80);

    // 7. Upload thumbnails
    const thumbnailUrls: string[] = [];

    for (const thumbnail of thumbnails) {
      const s3Path = `videos/thumbnails/${video.userId}/${videoId}/${thumbnail.filename}`;
      const url = await storage.upload(thumbnail.path, s3Path, {
        contentType: 'image/jpeg',
        metadata: {
          videoId,
          userId: video.userId,
          timestamp: thumbnail.timestamp.toString(),
        },
      });

      thumbnailUrls.push(url);

      logger.info('Thumbnail uploaded', {
        filename: thumbnail.filename,
        url,
      });
    }

    onProgress?.('thumbnails', 85);

    // 8. Upload raw video to persistent storage (if not already there)
    let rawVideoUrl = video.rawVideoUrl;

    if (rawVideoUrl?.startsWith('file://') || !rawVideoUrl?.startsWith('http')) {
      const s3Path = `videos/raw/${video.userId}/${videoId}/original.mp4`;
      rawVideoUrl = await storage.upload(rawVideoPath, s3Path, {
        contentType: 'video/mp4',
        metadata: {
          videoId,
          userId: video.userId,
        },
      });

      logger.info('Raw video uploaded to persistent storage', { rawVideoUrl });
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

    await prisma.video.update({
      where: { id: videoId },
      data: updateData,
    });

    logger.info('Database updated with URLs', {
      videoId,
      processedFormats: formatNames.length,
      thumbnails: thumbnailUrls.length,
    });

    onProgress?.('complete', 100);

    logger.info('Video processing workflow completed successfully', { videoId });
  } catch (error) {
    logger.error('Video processing failed', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update video status to FAILED
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'FAILED',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
      },
    });

    throw error;
  } finally {
    // 10. Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.info('Temp directory cleaned up', { tempDir });
    } catch (error) {
      logger.warn('Failed to cleanup temp directory', {
        tempDir,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
