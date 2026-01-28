import { config } from '../../config/env';
import { s3Storage } from './s3-client';
import { localStorage } from './local';
import { StorageService } from './types';

/**
 * Storage factory - returns appropriate storage service based on environment
 */
export function getStorageService(): StorageService {
  // Use S3 in production if credentials are available
  if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY && config.AWS_S3_BUCKET) {
    return s3Storage;
  }

  // Fall back to local storage for development
  return localStorage;
}

// Export singleton instance
export const storage = getStorageService();

// Export types and individual services
export { StorageService, UploadOptions } from './types';
export { s3Storage } from './s3-client';
export { localStorage } from './local';
