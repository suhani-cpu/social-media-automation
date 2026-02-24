import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const MAX_DURATION = 600; // 10 minutes in seconds
const MAX_CONCURRENT = 5;
const PROCESS_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms

@Injectable()
export class FfmpegCuttingService {
  private readonly logger = new Logger(FfmpegCuttingService.name);
  private activeProcesses = 0;
  private readonly queue: Array<() => void> = [];

  private ensureTempDir(): void {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.activeProcesses >= MAX_CONCURRENT) {
      return;
    }

    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Clip a video between start and end times
   */
  async clipVideo(
    inputUrl: string,
    startSeconds: number,
    endSeconds: number,
  ): Promise<string> {
    const duration = endSeconds - startSeconds;

    if (duration <= 0) {
      throw new Error('End time must be after start time');
    }

    if (duration > MAX_DURATION) {
      throw new Error(`Max clip duration is ${MAX_DURATION / 60} minutes`);
    }

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
          if (command) {
            command.kill('SIGKILL');
          }
          cleanup();
          reject(new Error('Processing timeout - exceeded 5 minutes'));
        }, PROCESS_TIMEOUT);

        command = ffmpeg(inputUrl)
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
            // Clean up partial file if exists
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

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    activeProcesses: number;
    queuedRequests: number;
    maxConcurrent: number;
  } {
    return {
      activeProcesses: this.activeProcesses,
      queuedRequests: this.queue.length,
      maxConcurrent: MAX_CONCURRENT,
    };
  }

  /**
   * Delete a temporary file
   */
  deleteTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      this.logger.error(`Failed to delete temp file: ${filePath}`, err);
    }
  }
}
