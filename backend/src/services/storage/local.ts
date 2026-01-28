import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { StorageService } from './types';

/**
 * Local file storage service for development
 * Stores files in a local directory instead of S3
 */
export class LocalStorageService implements StorageService {
  private baseDir: string;

  constructor(baseDir: string = '/tmp/social-media-uploads') {
    this.baseDir = baseDir;

    // Ensure base directory exists
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }

    logger.info('Local Storage Service initialized', { baseDir: this.baseDir });
  }

  async upload(localPath: string, remotePath: string): Promise<string> {
    try {
      const destPath = path.join(this.baseDir, remotePath);

      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy file
      await fs.copyFile(localPath, destPath);

      // Return local file URL
      const url = `file://${destPath}`;

      logger.info('File uploaded to local storage', {
        localPath,
        remotePath,
        destPath,
      });

      return url;
    } catch (error) {
      logger.error('Local storage upload failed:', {
        localPath,
        remotePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Local storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    try {
      const sourcePath = path.join(this.baseDir, remotePath);

      // Ensure destination directory exists
      const destDir = path.dirname(localPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy file
      await fs.copyFile(sourcePath, localPath);

      logger.info('File downloaded from local storage', {
        remotePath,
        localPath,
      });
    } catch (error) {
      logger.error('Local storage download failed:', {
        remotePath,
        localPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Local storage download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(remotePath: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, remotePath);

      await fs.unlink(filePath);

      logger.info('File deleted from local storage', { remotePath });
    } catch (error) {
      logger.error('Local storage delete failed:', {
        remotePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Local storage delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrl(remotePath: string, expirySeconds: number = 3600): Promise<string> {
    // For local storage, just return the file path
    const filePath = path.join(this.baseDir, remotePath);
    return `file://${filePath}`;
  }

  async exists(remotePath: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, remotePath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const localStorage = new LocalStorageService();
