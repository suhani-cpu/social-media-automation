export interface StorageService {
  /**
   * Upload a file to storage
   * @param localPath Path to local file
   * @param remotePath Destination path in storage
   * @returns Public URL or signed URL
   */
  upload(localPath: string, remotePath: string): Promise<string>;

  /**
   * Download a file from storage
   * @param remotePath Path in storage
   * @param localPath Destination local path
   */
  download(remotePath: string, localPath: string): Promise<void>;

  /**
   * Delete a file from storage
   * @param remotePath Path in storage
   */
  delete(remotePath: string): Promise<void>;

  /**
   * Get a signed URL for temporary access
   * @param remotePath Path in storage
   * @param expirySeconds Expiry time in seconds
   */
  getSignedUrl(remotePath: string, expirySeconds: number): Promise<string>;

  /**
   * Check if a file exists
   * @param remotePath Path in storage
   */
  exists(remotePath: string): Promise<boolean>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}
