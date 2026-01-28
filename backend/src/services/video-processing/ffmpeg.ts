import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../../utils/logger';
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

/**
 * Get video metadata using FFprobe
 */
export async function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        logger.error('FFprobe error:', err);
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      try {
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

        if (!videoStream) {
          throw new Error('No video stream found in file');
        }

        const result: VideoMetadata = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          format: metadata.format.format_name || 'unknown',
          bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : 0,
          fps: videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : 30,
          hasAudio: !!audioStream,
          hasVideo: !!videoStream,
          size: metadata.format.size || 0,
        };

        logger.info('Video metadata extracted', {
          inputPath,
          duration: result.duration,
          resolution: `${result.width}x${result.height}`,
          format: result.format,
        });

        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });
}

/**
 * Validate video file
 */
export async function validateVideo(inputPath: string): Promise<void> {
  const metadata = await getVideoMetadata(inputPath);

  if (!metadata.hasVideo) {
    throw new Error('File does not contain a video stream');
  }

  if (metadata.duration <= 0) {
    throw new Error('Invalid video duration');
  }

  if (metadata.width <= 0 || metadata.height <= 0) {
    throw new Error('Invalid video dimensions');
  }

  logger.info('Video validation passed', { inputPath });
}

export interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  format: VideoFormat;
  onProgress?: (progress: number) => void;
}

/**
 * Transcode video to specified format
 */
export async function transcodeVideo(options: TranscodeOptions): Promise<void> {
  const { inputPath, outputPath, format, onProgress } = options;

  return new Promise((resolve, reject) => {
    logger.info('Starting video transcode', {
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
        '-preset fast', // Encoding speed (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
        '-movflags +faststart', // Enable streaming (move moov atom to beginning)
        '-pix_fmt yuv420p', // Pixel format for compatibility
        '-profile:v baseline', // H.264 baseline profile for maximum compatibility
        '-level 3.0', // H.264 level
      ]);

    // Add scaling filter to maintain aspect ratio
    command.videoFilters([
      {
        filter: 'scale',
        options: {
          w: format.width,
          h: format.height,
          force_original_aspect_ratio: 'decrease', // Maintain aspect ratio
        },
      },
      {
        filter: 'pad',
        options: {
          w: format.width,
          h: format.height,
          x: '(ow-iw)/2', // Center horizontally
          y: '(oh-ih)/2', // Center vertically
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
      logger.info('FFmpeg command:', commandLine);
    });

    command.on('progress', (progress) => {
      const percent = progress.percent || 0;
      logger.debug(`Transcode progress: ${percent.toFixed(2)}%`, {
        outputPath,
      });

      if (onProgress) {
        onProgress(percent);
      }
    });

    command.on('end', () => {
      logger.info('Transcode completed', {
        outputPath,
        format: format.name,
      });
      resolve();
    });

    command.on('error', (err, stdout, stderr) => {
      logger.error('FFmpeg transcode error:', {
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
export async function extractThumbnail(
  inputPath: string,
  outputPath: string,
  timestamp: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info('Extracting thumbnail', {
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
        logger.info('Thumbnail extracted', { outputPath });
        resolve();
      })
      .on('error', (err) => {
        logger.error('Thumbnail extraction error:', err);
        reject(new Error(`Thumbnail extraction failed: ${err.message}`));
      });
  });
}
