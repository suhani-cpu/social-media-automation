import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FfmpegService } from './ffmpeg.service';

export interface ThumbnailOptions {
  inputPath: string;
  outputDir: string;
  timestamps?: number[]; // Timestamps in seconds
  count?: number; // Number of thumbnails to generate (if timestamps not provided)
}

export interface GeneratedThumbnail {
  path: string;
  timestamp: number;
  filename: string;
}

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  constructor(private readonly ffmpegService: FfmpegService) {}

  /**
   * Generate thumbnails at specified timestamps
   */
  async generateThumbnails(
    options: ThumbnailOptions,
  ): Promise<GeneratedThumbnail[]> {
    const { inputPath, outputDir, timestamps, count = 3 } = options;

    this.logger.log('Generating thumbnails', {
      inputPath,
      outputDir,
      count: timestamps?.length || count,
    });

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    let targetTimestamps: number[];

    if (timestamps && timestamps.length > 0) {
      targetTimestamps = timestamps;
    } else {
      // Auto-generate timestamps based on video duration
      const metadata = await this.ffmpegService.getVideoMetadata(inputPath);
      const duration = metadata.duration;

      if (duration <= 0) {
        throw new Error('Invalid video duration for thumbnail generation');
      }

      // Generate evenly spaced timestamps
      // For short videos (< 10s), take at 1s, 50%, end-1s
      // For longer videos, take at intervals
      if (duration <= 10) {
        targetTimestamps = [1, duration / 2, Math.max(duration - 1, 1)];
      } else {
        const interval = duration / (count + 1);
        targetTimestamps = Array.from(
          { length: count },
          (_, i) => (i + 1) * interval,
        );
      }
    }

    const thumbnails: GeneratedThumbnail[] = [];

    for (let i = 0; i < targetTimestamps.length; i++) {
      const timestamp = targetTimestamps[i];
      const filename = `thumbnail-${String(i + 1).padStart(5, '0')}.jpg`;
      const outputPath = path.join(outputDir, filename);

      try {
        await this.ffmpegService.extractThumbnail(
          inputPath,
          outputPath,
          timestamp,
        );

        thumbnails.push({
          path: outputPath,
          timestamp,
          filename,
        });

        this.logger.log('Thumbnail generated', {
          filename,
          timestamp,
        });
      } catch (error) {
        this.logger.error('Failed to generate thumbnail', {
          timestamp,
          error:
            error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with other thumbnails instead of failing completely
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('Failed to generate any thumbnails');
    }

    this.logger.log(`Generated ${thumbnails.length} thumbnails`, {
      outputDir,
    });

    return thumbnails;
  }

  /**
   * Generate thumbnails at standard timestamps (1s, 3s, 5s)
   */
  async generateStandardThumbnails(
    inputPath: string,
    outputDir: string,
  ): Promise<GeneratedThumbnail[]> {
    const metadata = await this.ffmpegService.getVideoMetadata(inputPath);
    const duration = metadata.duration;

    // For videos shorter than 5 seconds, adjust timestamps
    let timestamps: number[];
    if (duration < 5) {
      timestamps = [
        Math.min(1, duration * 0.2),
        duration * 0.5,
        duration * 0.8,
      ];
    } else {
      timestamps = [1, 3, 5];
    }

    return this.generateThumbnails({
      inputPath,
      outputDir,
      timestamps,
    });
  }
}
