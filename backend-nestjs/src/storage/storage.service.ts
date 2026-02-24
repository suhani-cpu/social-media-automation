import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import AWS from 'aws-sdk';

export interface StorageProvider {
  upload(localPath: string, remotePath: string): Promise<string>;
  download(remotePath: string, localPath: string): Promise<void>;
  delete(remotePath: string): Promise<void>;
  getSignedUrl(remotePath: string, expirySeconds?: number): Promise<string>;
  exists(remotePath: string): Promise<boolean>;
}

@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private s3: AWS.S3 | null = null;
  private readonly bucket: string;
  private readonly useS3: boolean;
  private readonly localDir: string;

  constructor(private readonly configService: ConfigService) {
    const accessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '');
    this.localDir = '/tmp/storage';
    this.useS3 = !!(accessKey && secretKey && this.bucket);

    if (this.useS3) {
      this.s3 = new AWS.S3({
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });
      this.logger.log('Using S3 storage');
    } else {
      this.logger.log('Using local storage');
    }
  }

  async upload(localPath: string, remotePath: string): Promise<string> {
    if (this.useS3 && this.s3) {
      const fileContent = await fs.readFile(localPath);
      const result = await this.s3.upload({
        Bucket: this.bucket,
        Key: remotePath,
        Body: fileContent,
      }).promise();
      return result.Location;
    }

    const destPath = path.join(this.localDir, remotePath);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(localPath, destPath);
    return destPath;
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    if (this.useS3 && this.s3) {
      const result = await this.s3.getObject({
        Bucket: this.bucket,
        Key: remotePath,
      }).promise();
      await fs.writeFile(localPath, result.Body as Buffer);
      return;
    }

    const srcPath = path.join(this.localDir, remotePath);
    await fs.copyFile(srcPath, localPath);
  }

  async delete(remotePath: string): Promise<void> {
    if (this.useS3 && this.s3) {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: remotePath,
      }).promise();
      return;
    }

    const filePath = path.join(this.localDir, remotePath);
    try {
      await fs.unlink(filePath);
    } catch { /* ignore */ }
  }

  async getSignedUrl(remotePath: string, expirySeconds = 3600): Promise<string> {
    if (this.useS3 && this.s3) {
      return this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: remotePath,
        Expires: expirySeconds,
      });
    }
    return path.join(this.localDir, remotePath);
  }

  async exists(remotePath: string): Promise<boolean> {
    if (this.useS3 && this.s3) {
      try {
        await this.s3.headObject({ Bucket: this.bucket, Key: remotePath }).promise();
        return true;
      } catch {
        return false;
      }
    }

    try {
      await fs.access(path.join(this.localDir, remotePath));
      return true;
    } catch {
      return false;
    }
  }
}
