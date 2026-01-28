import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { StorageService, UploadOptions } from './types';

export class S3StorageService implements StorageService {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    // Configure AWS
    AWS.config.update({
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      region: config.AWS_REGION,
    });

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
    });

    this.bucket = config.AWS_S3_BUCKET!;

    logger.info('S3 Storage Service initialized', {
      bucket: this.bucket,
      region: config.AWS_REGION,
    });
  }

  async upload(
    localPath: string,
    remotePath: string,
    options?: UploadOptions
  ): Promise<string> {
    try {
      // Read file
      const fileContent = fs.readFileSync(localPath);

      // Determine content type from file extension if not provided
      const contentType =
        options?.contentType || this.getContentType(localPath);

      // Upload to S3
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: remotePath,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: options?.cacheControl || 'max-age=31536000', // 1 year cache
        Metadata: options?.metadata || {},
      };

      await this.s3.putObject(params).promise();

      const url = `https://${this.bucket}.s3.${config.AWS_REGION}.amazonaws.com/${remotePath}`;

      logger.info('File uploaded to S3', {
        localPath,
        remotePath,
        url,
        size: fileContent.length,
      });

      return url;
    } catch (error) {
      logger.error('S3 upload failed:', {
        localPath,
        remotePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: remotePath,
      };

      const data = await this.s3.getObject(params).promise();

      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(localPath, data.Body as Buffer);

      logger.info('File downloaded from S3', {
        remotePath,
        localPath,
        size: data.ContentLength,
      });
    } catch (error) {
      logger.error('S3 download failed:', {
        remotePath,
        localPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(remotePath: string): Promise<void> {
    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: remotePath,
      };

      await this.s3.deleteObject(params).promise();

      logger.info('File deleted from S3', { remotePath });
    } catch (error) {
      logger.error('S3 delete failed:', {
        remotePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSignedUrl(
    remotePath: string,
    expirySeconds: number = 3600
  ): Promise<string> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: remotePath,
      };

      const url = await this.s3.getSignedUrlPromise('getObject', {
        ...params,
        Expires: expirySeconds,
      });

      logger.info('Signed URL generated', {
        remotePath,
        expirySeconds,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL:', {
        remotePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: remotePath,
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMany(remotePaths: string[]): Promise<void> {
    if (remotePaths.length === 0) return;

    try {
      const params: AWS.S3.DeleteObjectsRequest = {
        Bucket: this.bucket,
        Delete: {
          Objects: remotePaths.map((key) => ({ Key: key })),
          Quiet: true,
        },
      };

      await this.s3.deleteObjects(params).promise();

      logger.info(`Deleted ${remotePaths.length} files from S3`);
    } catch (error) {
      logger.error('S3 batch delete failed:', error);
      throw new Error(`S3 batch delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}

// Export singleton instance
export const s3Storage = new S3StorageService();
