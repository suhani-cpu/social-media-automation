import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { VideoFormat } from './formats';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  bitrate: number;
  fps: number;
  hasAudio: boolean;
  hasVideo: boolean;
  size: number;
}

export interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  format: VideoFormat;
  onProgress?: (progress: number) => void;
}

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  /**
   * Get video metadata using FFprobe
   */
  async getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          this.logger.error('FFprobe error:', err);
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        try {
          const videoStream = metadata.streams.find(
            (s) => s.codec_type === 'video',
          );
          const audioStream = metadata.streams.find(
            (s) => s.codec_type === 'audio',
          );

          if (!videoStream) {
            throw new Error('No video stream found in file');
          }

          const result: VideoMetadata = {
            duration: metadata.format.duration || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            format: metadata.format.format_name || 'unknown',
            bitrate: Number(metadata.format.bit_rate) || 0,
            fps: videoStream.r_frame_rate
              ? eval(videoStream.r_frame_rate)
              : 30,
            hasAudio: !!audioStream,
            hasVideo: !!videoStream,
            size: metadata.format.size || 0,
          };

          this.logger.log('Video metadata extracted', {
            inputPath,
            duration: result.duration,
            resolution: `${result.width}x${result.height}`,
            format: result.format,
          });

          resolve(result);
        } catch (error) {
          reject(
            new Error(
              `Failed to parse video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
        }
      });
    });
  }

  /**
   * Validate video file
   */
  async validateVideo(inputPath: string): Promise<void> {
    const metadata = await this.getVideoMetadata(inputPath);

    if (!metadata.hasVideo) {
      throw new Error('File does not contain a video stream');
    }

    if (metadata.duration <= 0) {
      throw new Error('Invalid video duration');
    }

    if (metadata.width <= 0 || metadata.height <= 0) {
      throw new Error('Invalid video dimensions');
    }

    this.logger.log('Video validation passed', { inputPath });
  }

  /**
   * Transcode video to specified format
   */
  async transcodeVideo(options: TranscodeOptions): Promise<void> {
    const { inputPath, outputPath, format, onProgress } = options;

    return new Promise((resolve, reject) => {
      this.logger.log('Starting video transcode', {
        inputPath,
        outputPath,
        format: format.name,
      });

      const command = ffmpeg(inputPath)
        .videoCodec(format.codec)
        .audioCodec(format.audioCodec)
        .size(format.resolution)
        .videoBitrate(format.videoBitrate)
        .audioBitrate(format.audioBitrate)
        .fps(format.fps)
        .aspect(format.aspectRatio)
        .format(format.format)
        .outputOptions([
          '-preset fast',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-profile:v baseline',
          '-level 3.0',
        ]);

      // Add scaling filter to maintain aspect ratio
      command.videoFilters([
        {
          filter: 'scale',
          options: {
            w: format.width,
            h: format.height,
            force_original_aspect_ratio: 'decrease',
          },
        },
        {
          filter: 'pad',
          options: {
            w: format.width,
            h: format.height,
            x: '(ow-iw)/2',
            y: '(oh-ih)/2',
            color: 'black',
          },
        },
      ]);

      // Trim video if it exceeds max duration
      if (format.maxDuration) {
        command.duration(format.maxDuration);
      }

      // Progress handler
      command.on('start', (commandLine) => {
        this.logger.log('FFmpeg command:', commandLine);
      });

      command.on('progress', (progress) => {
        const percent = progress.percent || 0;
        this.logger.debug(`Transcode progress: ${percent.toFixed(2)}%`, {
          outputPath,
        });

        if (onProgress) {
          onProgress(percent);
        }
      });

      command.on('end', () => {
        this.logger.log('Transcode completed', {
          outputPath,
          format: format.name,
        });
        resolve();
      });

      command.on('error', (err, stdout, stderr) => {
        this.logger.error('FFmpeg transcode error:', {
          error: err.message,
          stdout,
          stderr,
        });
        reject(new Error(`Transcode failed: ${err.message}`));
      });

      command.save(outputPath);
    });
  }

  /**
   * Extract single frame as thumbnail
   */
  async extractThumbnail(
    inputPath: string,
    outputPath: string,
    timestamp: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log('Extracting thumbnail', {
        inputPath,
        outputPath,
        timestamp,
      });

      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: outputPath.split('/').pop()!,
          folder: outputPath.substring(0, outputPath.lastIndexOf('/')),
          size: '1920x1080',
        })
        .on('end', () => {
          this.logger.log('Thumbnail extracted', { outputPath });
          resolve();
        })
        .on('error', (err) => {
          this.logger.error('Thumbnail extraction error:', err);
          reject(new Error(`Thumbnail extraction failed: ${err.message}`));
        });
    });
  }
}
