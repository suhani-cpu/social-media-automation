import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import * as ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

// Configure ffmpeg-static binary path for serverless
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic) {
    (ffmpeg as any).setFfmpegPath(ffmpegStatic);
  }
} catch {
  // ffmpeg-static not available, fall back to system ffmpeg
}

const TEMP_DIR = '/tmp/clips';
const MAX_DURATION = 600; // 10 minutes in seconds
const MAX_CONCURRENT = 5;
const PROCESS_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
const FRAMING_TIMEOUT = 10 * 60 * 1000; // 10 minutes in ms
const LOGO_PATH = path.join(process.cwd(), 'uploads', 'logo.png');

export interface ClipVideoDto {
  videoId: string;
  startTime: number;
  endTime: number;
  format?: string; // aspect ratio: '16:9', '9:16', '1:1', 'original'
  overlay?: {
    topCaption?: string;
    bottomCaption?: string;
    captionFontSize?: number;
    captionColor?: string;
    captionFont?: string;
    paddingColor?: string;
    logoX?: number;
    logoY?: number;
    logoScale?: number;
  };
}

interface PaddedDimensions {
  outputWidth: number;
  outputHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  padX: number;
  padY: number;
}

interface VideoDimensions {
  width: number;
  height: number;
  duration: number;
}

@Injectable()
export class ClipsService {
  private readonly logger = new Logger(ClipsService.name);
  private activeProcesses = 0;
  private readonly queue: Array<() => void> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: DriveService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Clip a video (cut + optional framing/overlay) and persist the result.
   */
  async clipVideo(userId: string, body: ClipVideoDto) {
    const { videoId, startTime, endTime, format, overlay } = body;

    // Validate duration
    const duration = endTime - startTime;
    if (duration <= 0) {
      throw new BadRequestException('End time must be after start time');
    }
    if (duration > MAX_DURATION) {
      throw new BadRequestException(
        `Max clip duration is ${MAX_DURATION / 60} minutes`,
      );
    }

    // Fetch the source video
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Resolve input file: local path, or download from Google Drive
    let inputUrl = video.rawVideoUrl || video.sourceUrl;
    let downloadedFromDrive = false;
    const metadata = video.metadata as Record<string, any> | null;

    if (!inputUrl || !fs.existsSync(inputUrl)) {
      // Try Google Drive
      const driveFileId = metadata?.driveFileId as string | undefined;
      if (driveFileId) {
        this.logger.log(`Downloading video from Drive for clipping: ${driveFileId}`);
        inputUrl = await this.driveService.downloadToTemp(
          userId,
          driveFileId,
          metadata?.driveFileName,
        );
        downloadedFromDrive = true;
      } else {
        throw new BadRequestException(
          'Video file not available for clipping. The file may have been removed from temporary storage.',
        );
      }
    }

    // Step 1 -- Cut the clip
    const clippedPath = await this.cutClip(inputUrl, startTime, duration);

    // Clean up Drive download after clipping
    if (downloadedFromDrive) {
      this.deleteTempFile(inputUrl);
    }

    // Step 2 -- Apply framing / overlay if requested
    let outputPath = clippedPath;
    if (format && format !== 'original') {
      outputPath = await this.applyFraming(clippedPath, {
        aspectRatio: format,
        paddingColor: overlay?.paddingColor,
        topCaption: overlay?.topCaption,
        bottomCaption: overlay?.bottomCaption,
        captionFontSize: overlay?.captionFontSize,
        captionColor: overlay?.captionColor,
        captionFont: overlay?.captionFont,
        logoX: overlay?.logoX,
        logoY: overlay?.logoY,
        logoScale: overlay?.logoScale,
      });

      // Clean up intermediate clipped file when framing produced a new file
      if (outputPath !== clippedPath) {
        this.deleteTempFile(clippedPath);
      }
    }

    // Get output file stats
    const stats = fs.statSync(outputPath);

    this.logger.log(
      `Clip created for video ${videoId}: ${outputPath} (${stats.size} bytes)`,
    );

    return {
      message: 'Video clipped successfully',
      clip: {
        videoId,
        outputPath,
        fileSize: stats.size,
        duration,
        format: format || 'original',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // FFmpeg clip operation
  // ---------------------------------------------------------------------------

  private ensureTempDir() {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  }

  private processQueue() {
    if (this.queue.length === 0 || this.activeProcesses >= MAX_CONCURRENT) {
      return;
    }
    const next = this.queue.shift();
    if (next) next();
  }

  private cutClip(
    inputUrl: string,
    startSeconds: number,
    duration: number,
  ): Promise<string> {
    this.ensureTempDir();

    return new Promise((resolve, reject) => {
      const executeClip = () => {
        this.activeProcesses++;

        const outputFileName = `${uuidv4()}.mp4`;
        const outputPath = path.join(TEMP_DIR, outputFileName);

        let timeoutId: NodeJS.Timeout;
        let command: any;

        const cleanup = () => {
          this.activeProcesses--;
          if (timeoutId) clearTimeout(timeoutId);
          this.processQueue();
        };

        timeoutId = setTimeout(() => {
          if (command) command.kill('SIGKILL');
          cleanup();
          reject(new Error('Processing timeout - exceeded 5 minutes'));
        }, PROCESS_TIMEOUT);

        command = (ffmpeg as any)(inputUrl)
          .setStartTime(startSeconds)
          .setDuration(duration)
          .outputOptions(['-c', 'copy'])
          .output(outputPath)
          .on('end', () => {
            cleanup();
            resolve(outputPath);
          })
          .on('error', (err: Error) => {
            cleanup();
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
            reject(new Error(`FFmpeg error: ${err.message}`));
          });

        command.run();
      };

      if (this.activeProcesses >= MAX_CONCURRENT) {
        this.queue.push(executeClip);
      } else {
        executeClip();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Framing / overlay
  // ---------------------------------------------------------------------------

  private getVideoDimensions(inputPath: string): Promise<VideoDimensions> {
    return new Promise((resolve, reject) => {
      (ffmpeg as any).ffprobe(inputPath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }
        const videoStream = metadata.streams.find(
          (s: any) => s.codec_type === 'video',
        );
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }
        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: metadata.format.duration || 0,
        });
      });
    });
  }

  private calculatePaddedDimensions(
    inputWidth: number,
    inputHeight: number,
    targetAspect: string,
  ): PaddedDimensions {
    const scaledWidth = inputWidth;
    const scaledHeight = inputHeight;
    let outputWidth: number;
    let outputHeight: number;

    if (targetAspect === '1:1') {
      const size = Math.max(inputWidth, inputHeight);
      outputWidth = size;
      outputHeight = size;
    } else if (targetAspect === '16:9') {
      const targetRatio = 16 / 9;
      if (inputWidth / inputHeight > targetRatio) {
        outputWidth = inputWidth;
        outputHeight = Math.round(inputWidth / targetRatio);
      } else {
        outputHeight = inputHeight;
        outputWidth = Math.round(inputHeight * targetRatio);
      }
    } else if (targetAspect === '9:16') {
      const targetRatio = 9 / 16;
      if (inputWidth / inputHeight > targetRatio) {
        outputWidth = inputWidth;
        outputHeight = Math.round(inputWidth / targetRatio);
      } else {
        outputHeight = inputHeight;
        outputWidth = Math.round(inputHeight * targetRatio);
      }
    } else {
      outputWidth = inputWidth;
      outputHeight = inputHeight;
    }

    const padX = Math.round((outputWidth - scaledWidth) / 2);
    const padY = Math.round((outputHeight - scaledHeight) / 2);

    return { outputWidth, outputHeight, scaledWidth, scaledHeight, padX, padY };
  }

  private getLogoPath(): string | null {
    return fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
  }

  private buildFilterComplex(options: {
    aspectRatio?: string;
    paddingColor?: string;
    topCaption?: string;
    bottomCaption?: string;
    captionFontSize?: number;
    captionColor?: string;
    captionFont?: string;
    logoX?: number;
    logoY?: number;
    logoScale?: number;
    inputWidth?: number;
    inputHeight?: number;
  }) {
    const {
      aspectRatio,
      paddingColor = '#000000',
      topCaption,
      bottomCaption,
      captionFontSize = 24,
      captionColor = 'white',
      captionFont = 'sans-serif',
      logoX = 85,
      logoY = 15,
      logoScale = 0.15,
      inputWidth = 1920,
      inputHeight = 1080,
    } = options;

    const filters: string[] = [];
    let currentOutput = '0:v';
    let filterIndex = 0;
    const logoPath = this.getLogoPath();
    const hasLogo = !!logoPath;

    if (aspectRatio === 'original' && !topCaption && !bottomCaption && !hasLogo) {
      return null;
    }

    let dims: PaddedDimensions | null = null;
    if (aspectRatio && aspectRatio !== 'original') {
      dims = this.calculatePaddedDimensions(inputWidth, inputHeight, aspectRatio);
    }

    // 1. Scale and pad for aspect ratio
    if (dims) {
      const colorHex = paddingColor.replace('#', '');
      filters.push(
        `[${currentOutput}]scale=${dims.scaledWidth}:${dims.scaledHeight}[scaled${filterIndex}]`,
      );
      currentOutput = `scaled${filterIndex}`;
      filterIndex++;
      filters.push(
        `[${currentOutput}]pad=${dims.outputWidth}:${dims.outputHeight}:${dims.padX}:${dims.padY}:color=#${colorHex}[padded${filterIndex}]`,
      );
      currentOutput = `padded${filterIndex}`;
      filterIndex++;
    }

    // Font mapping
    const fontMap: Record<string, string> = {
      'sans-serif': 'Sans',
      serif: 'Serif',
      monospace: 'Monospace',
      arial: 'Arial',
      helvetica: 'Helvetica',
      times: 'Times',
      georgia: 'Georgia',
      impact: 'Impact',
    };
    const fontFamily = fontMap[captionFont] || 'Sans';
    const textColor = captionColor.startsWith('#')
      ? captionColor.slice(1)
      : captionColor;

    // 2. Top caption
    if (topCaption && topCaption.trim()) {
      const escapedText = topCaption.replace(/'/g, "\\'").replace(/:/g, '\\:');
      const xPos = '(w*50/100-text_w/2)';
      const yPos = '(h*10/100-text_h/2)';
      filters.push(
        `[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[top${filterIndex}]`,
      );
      currentOutput = `top${filterIndex}`;
      filterIndex++;
    }

    // 3. Bottom caption
    if (bottomCaption && bottomCaption.trim()) {
      const escapedText = bottomCaption
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:');
      const xPos = '(w*50/100-text_w/2)';
      const yPos = '(h*90/100-text_h/2)';
      filters.push(
        `[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[bottom${filterIndex}]`,
      );
      currentOutput = `bottom${filterIndex}`;
      filterIndex++;
    }

    // 4. Logo overlay
    if (hasLogo) {
      const outputWidth = dims ? dims.outputWidth : inputWidth;
      const logoW = Math.round(outputWidth * logoScale);
      const overlayX = `(W*${logoX}/100-w/2)`;
      const overlayY = `(H*${logoY}/100-h/2)`;
      filters.push(`[1:v]scale=${logoW}:-1[logo${filterIndex}]`);
      filters.push(
        `[${currentOutput}][logo${filterIndex}]overlay=${overlayX}:${overlayY}[final${filterIndex}]`,
      );
      currentOutput = `final${filterIndex}`;
      filterIndex++;
    }

    // Mark final output
    if (filters.length > 0) {
      const lastFilter = filters[filters.length - 1];
      filters[filters.length - 1] = lastFilter.replace(
        /\[[^\]]+\]$/,
        '[vout]',
      );
    }

    return {
      filterComplex: filters.join(';'),
      outputLabel: 'vout',
      hasLogo,
    };
  }

  private async applyFraming(
    inputPath: string,
    options: {
      aspectRatio?: string;
      paddingColor?: string;
      topCaption?: string;
      bottomCaption?: string;
      captionFontSize?: number;
      captionColor?: string;
      captionFont?: string;
      logoX?: number;
      logoY?: number;
      logoScale?: number;
    },
  ): Promise<string> {
    this.ensureTempDir();

    const dimensions = await this.getVideoDimensions(inputPath);

    const filterResult = this.buildFilterComplex({
      ...options,
      inputWidth: dimensions.width,
      inputHeight: dimensions.height,
    });

    // If no filters needed, return input as-is
    if (!filterResult) {
      return inputPath;
    }

    const outputFileName = `${uuidv4()}.mp4`;
    const outputPath = path.join(TEMP_DIR, outputFileName);
    const logoPath = this.getLogoPath();

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let command: any;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        if (command) command.kill('SIGKILL');
        cleanup();
        reject(new Error('Framing timeout - exceeded 10 minutes'));
      }, FRAMING_TIMEOUT);

      command = (ffmpeg as any)(inputPath);

      if (filterResult.hasLogo && logoPath) {
        command.input(logoPath);
      }

      command
        .complexFilter(filterResult.filterComplex)
        .outputOptions([
          '-map',
          `[${filterResult.outputLabel}]`,
          '-map',
          '0:a?',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-c:a',
          'aac',
        ])
        .output(outputPath)
        .on('end', () => {
          cleanup();
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          cleanup();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(new Error(`Framing error: ${err.message}`));
        });

      command.run();
    });
  }

  private deleteTempFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      this.logger.error(`Failed to delete temp file: ${filePath}`);
    }
  }
}
