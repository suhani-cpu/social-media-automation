import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const MAX_DURATION = 600; // 10 minutes in seconds
const MAX_CONCURRENT = 5;
const PROCESS_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms

let activeProcesses = 0;
const queue: Array<() => void> = [];

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function processQueue() {
  if (queue.length === 0 || activeProcesses >= MAX_CONCURRENT) {
    return;
  }

  const next = queue.shift();
  if (next) {
    next();
  }
}

export async function clipVideo(inputUrl: string, startSeconds: number, endSeconds: number): Promise<string> {
  const duration = endSeconds - startSeconds;

  if (duration <= 0) {
    throw new Error('End time must be after start time');
  }

  if (duration > MAX_DURATION) {
    throw new Error(`Max clip duration is ${MAX_DURATION / 60} minutes`);
  }

  ensureTempDir();

  return new Promise((resolve, reject) => {
    const executeClip = () => {
      activeProcesses++;

      const outputFileName = `${uuidv4()}.mp4`;
      const outputPath = path.join(TEMP_DIR, outputFileName);

      let timeoutId: NodeJS.Timeout;
      let command: any;

      const cleanup = () => {
        activeProcesses--;
        if (timeoutId) clearTimeout(timeoutId);
        processQueue();
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

    if (activeProcesses >= MAX_CONCURRENT) {
      queue.push(executeClip);
    } else {
      executeClip();
    }
  });
}

export function getQueueStatus() {
  return {
    activeProcesses,
    queuedRequests: queue.length,
    maxConcurrent: MAX_CONCURRENT
  };
}

export function deleteTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete temp file: ${filePath}`, err);
  }
}
