import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import { getAuthenticatedClient } from '../auth/drive-oauth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  isFolder: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
  createdTime?: string;
}

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
];

export class DriveStorageService {
  private drive: drive_v3.Drive;

  constructor(private userId: string) {}

  private async initialize() {
    const auth = await getAuthenticatedClient(this.userId);
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * List files in a folder (or root if no folderId provided)
   */
  async listFiles(folderId?: string, videosOnly: boolean = true): Promise<DriveFile[]> {
    try {
      await this.initialize();

      let query = folderId
        ? `'${folderId}' in parents and trashed = false`
        : `'root' in parents and trashed = false`;

      if (videosOnly) {
        const mimeTypeQuery = VIDEO_MIME_TYPES.map((mt) => `mimeType='${mt}'`).join(' or ');
        query += ` and (${mimeTypeQuery})`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
        pageSize: 100,
        orderBy: 'modifiedTime desc',
      });

      const files: DriveFile[] = (response.data.files || []).map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size,
        createdTime: file.createdTime || undefined,
        modifiedTime: file.modifiedTime || undefined,
        webViewLink: file.webViewLink || undefined,
        thumbnailLink: file.thumbnailLink || undefined,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      }));

      logger.info(`Listed ${files.length} files from Google Drive folder ${folderId || 'root'}`);
      return files;
    } catch (error) {
      logger.error('Error listing Google Drive files:', error);
      throw error;
    }
  }

  /**
   * List folders only
   */
  async listFolders(parentFolderId?: string): Promise<DriveFolder[]> {
    try {
      await this.initialize();

      const query = parentFolderId
        ? `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`
        : `'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, createdTime)',
        pageSize: 100,
        orderBy: 'name',
      });

      const folders: DriveFolder[] = (response.data.files || []).map((folder) => ({
        id: folder.id!,
        name: folder.name!,
        createdTime: folder.createdTime || undefined,
      }));

      logger.info(`Listed ${folders.length} folders from Google Drive`);
      return folders;
    } catch (error) {
      logger.error('Error listing Google Drive folders:', error);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string, destinationPath: string): Promise<string> {
    try {
      await this.initialize();

      // Get file metadata first
      const fileMetadata = await this.drive.files.get({
        fileId,
        fields: 'name, mimeType, size',
      });

      logger.info(
        `Downloading file ${fileMetadata.data.name} (${fileMetadata.data.size} bytes) from Google Drive`
      );

      // Download file
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        { responseType: 'stream' }
      );

      // Write to destination
      const dest = require('fs').createWriteStream(destinationPath);

      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            logger.info(`File downloaded successfully to ${destinationPath}`);
            resolve(destinationPath);
          })
          .on('error', (err: Error) => {
            logger.error('Error downloading file:', err);
            reject(err);
          })
          .pipe(dest);
      });
    } catch (error) {
      logger.error('Error downloading file from Google Drive:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    folderId?: string
  ): Promise<{ id: string; name: string; webViewLink: string }> {
    try {
      await this.initialize();

      const fileMetadata: drive_v3.Schema$File = {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      };

      const media = {
        mimeType: 'video/mp4',
        body: require('fs').createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      logger.info(`File uploaded successfully: ${response.data.name} (ID: ${response.data.id})`);

      return {
        id: response.data.id!,
        name: response.data.name!,
        webViewLink: response.data.webViewLink!,
      };
    } catch (error) {
      logger.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(folderName: string, parentFolderId?: string): Promise<DriveFolder> {
    try {
      await this.initialize();

      const fileMetadata: drive_v3.Schema$File = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, createdTime',
      });

      logger.info(`Folder created: ${response.data.name} (ID: ${response.data.id})`);

      return {
        id: response.data.id!,
        name: response.data.name!,
        createdTime: response.data.createdTime || undefined,
      };
    } catch (error) {
      logger.error('Error creating folder in Google Drive:', error);
      throw error;
    }
  }

  /**
   * Get or create the Stage OTT folder structure
   */
  async ensureStageOTTFolder(): Promise<string> {
    try {
      await this.initialize();

      // Check if "Stage OTT Videos" folder exists
      const query = `name='Stage OTT Videos' and mimeType='application/vnd.google-apps.folder' and trashed = false`;
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 1,
      });

      if (response.data.files && response.data.files.length > 0) {
        logger.info('Stage OTT Videos folder already exists');
        return response.data.files[0].id!;
      }

      // Create main folder
      const mainFolder = await this.createFolder('Stage OTT Videos');

      // Create subfolders
      await Promise.all([
        this.createFolder('Raw Videos', mainFolder.id),
        this.createFolder('Processed', mainFolder.id),
        this.createFolder('Thumbnails', mainFolder.id),
      ]);

      logger.info('Stage OTT folder structure created');
      return mainFolder.id;
    } catch (error) {
      logger.error('Error ensuring Stage OTT folder:', error);
      throw error;
    }
  }

  /**
   * Get folder ID by name
   */
  async getFolderByName(folderName: string, parentId?: string): Promise<string | null> {
    try {
      await this.initialize();

      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed = false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id)',
        pageSize: 1,
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
      }

      return null;
    } catch (error) {
      logger.error('Error getting folder by name:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      await this.initialize();

      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
      });

      return {
        id: response.data.id!,
        name: response.data.name!,
        mimeType: response.data.mimeType!,
        size: response.data.size || undefined,
        createdTime: response.data.createdTime || undefined,
        modifiedTime: response.data.modifiedTime || undefined,
        webViewLink: response.data.webViewLink || undefined,
        thumbnailLink: response.data.thumbnailLink || undefined,
        isFolder: response.data.mimeType === 'application/vnd.google-apps.folder',
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }
}
