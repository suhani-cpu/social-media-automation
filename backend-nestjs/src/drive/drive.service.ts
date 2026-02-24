import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google, drive_v3 } from 'googleapis';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';

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

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  /** In-memory store for CSRF state tokens (maps stateToken -> { userId, expires }) */
  private pendingStates = new Map<
    string,
    { userId: string; expires: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // OAuth helpers
  // ---------------------------------------------------------------------------

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_DRIVE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_DRIVE_REDIRECT_URI'),
    );
  }

  /**
   * Obtain an authenticated Google Drive client for a given user.
   * Automatically refreshes expired tokens.
   */
  private async getAuthenticatedClient(userId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: 'GOOGLE_DRIVE',
        status: 'ACTIVE',
      },
    });

    if (!account) {
      throw new NotFoundException('Google Drive account not connected');
    }

    const client = this.getOAuth2Client();

    // Refresh token if expired
    if (account.tokenExpiry && account.tokenExpiry < new Date()) {
      await this.refreshAccessToken(account.id);
      const updatedAccount = await this.prisma.socialAccount.findUnique({
        where: { id: account.id },
      });
      if (updatedAccount) {
        client.setCredentials({
          access_token: updatedAccount.accessToken,
          refresh_token: updatedAccount.refreshToken || undefined,
        });
      }
    } else {
      client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken || undefined,
      });
    }

    return client;
  }

  private async refreshAccessToken(accountId: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || !account.refreshToken) {
      throw new BadRequestException(
        'Account not found or no refresh token available',
      );
    }

    const client = this.getOAuth2Client();
    client.setCredentials({ refresh_token: account.refreshToken });

    const { credentials } = await client.refreshAccessToken();

    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: credentials.access_token!,
        tokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      },
    });

    this.logger.log(
      `Access token refreshed for Google Drive account ${accountId}`,
    );
    return credentials.access_token;
  }

  private getDriveClient(auth: any): drive_v3.Drive {
    return google.drive({ version: 'v3', auth });
  }

  // ---------------------------------------------------------------------------
  // OAuth flow
  // ---------------------------------------------------------------------------

  /**
   * Generate a Google OAuth authorization URL for the given user.
   */
  async startAuth(userId: string): Promise<{ authUrl: string }> {
    const client = this.getOAuth2Client();

    // Generate CSRF-safe state token
    const stateToken = crypto.randomBytes(32).toString('hex');
    this.pendingStates.set(stateToken, {
      userId,
      expires: Date.now() + 10 * 60 * 1000, // 10 min expiry
    });

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: stateToken,
      prompt: 'consent',
    });

    return {
      message: 'Authorization URL generated',
      authUrl,
    } as any;
  }

  /**
   * Handle the OAuth callback: exchange code for tokens and persist the account.
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<string> {
    // Resolve the CSRF state token
    const entry = this.pendingStates.get(state);
    if (!entry) {
      throw new BadRequestException('Invalid or expired OAuth state token');
    }
    if (Date.now() > entry.expires) {
      this.pendingStates.delete(state);
      throw new BadRequestException('OAuth state token expired');
    }
    this.pendingStates.delete(state);
    const userId = entry.userId;

    const client = this.getOAuth2Client();

    this.logger.log(
      `Drive OAuth: exchanging code for tokens for user ${userId}`,
    );
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Store or update the Drive account
    await this.prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId,
          platform: 'GOOGLE_DRIVE',
          accountId: userInfo.id || userInfo.email || 'drive-user',
        },
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        username: userInfo.email || 'drive-user',
        status: 'ACTIVE',
      },
      create: {
        userId,
        platform: 'GOOGLE_DRIVE',
        accountId: userInfo.id || userInfo.email || 'drive-user',
        username: userInfo.email || 'drive-user',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Google Drive account connected for user ${userId}`);

    // Return redirect URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return `${frontendUrl}/dashboard/accounts?drive=connected`;
  }

  // ---------------------------------------------------------------------------
  // Status / Disconnect
  // ---------------------------------------------------------------------------

  /**
   * Check whether the user has an active Google Drive connection.
   */
  async getStatus(userId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: 'GOOGLE_DRIVE',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      connected: !!account,
      account: account || null,
    };
  }

  /**
   * Disconnect the user's Google Drive account.
   */
  async disconnect(userId: string) {
    await this.prisma.socialAccount.updateMany({
      where: {
        userId,
        platform: 'GOOGLE_DRIVE',
      },
      data: {
        status: 'DISCONNECTED',
      },
    });

    this.logger.log(`Google Drive disconnected for user ${userId}`);

    return { message: 'Google Drive disconnected successfully' };
  }

  // ---------------------------------------------------------------------------
  // Drive storage operations
  // ---------------------------------------------------------------------------

  /**
   * List folders in a Google Drive directory (or root if no parentId).
   */
  async listFolders(
    userId: string,
    parentId?: string,
  ): Promise<{ folders: DriveFolder[] }> {
    const auth = await this.getAuthenticatedClient(userId);
    const drive = this.getDriveClient(auth);

    const query = parentId
      ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`
      : `'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime)',
      pageSize: 100,
      orderBy: 'name',
    });

    const folders: DriveFolder[] = (response.data.files || []).map(
      (folder) => ({
        id: folder.id!,
        name: folder.name!,
        createdTime: folder.createdTime || undefined,
      }),
    );

    this.logger.log(`Listed ${folders.length} folders from Google Drive`);
    return { folders };
  }

  /**
   * List files in a Google Drive folder.
   * When videosOnly is true, only video MIME types are returned.
   */
  async listFiles(
    userId: string,
    folderId?: string,
    videosOnly: boolean = true,
  ): Promise<{ files: DriveFile[] }> {
    const auth = await this.getAuthenticatedClient(userId);
    const drive = this.getDriveClient(auth);

    let query = folderId
      ? `'${folderId}' in parents and trashed = false`
      : `'root' in parents and trashed = false`;

    if (videosOnly) {
      const mimeTypeQuery = VIDEO_MIME_TYPES.map(
        (mt) => `mimeType='${mt}'`,
      ).join(' or ');
      query += ` and (${mimeTypeQuery})`;
    }

    const response = await drive.files.list({
      q: query,
      fields:
        'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
      pageSize: 100,
      orderBy: 'modifiedTime desc',
    });

    const files: DriveFile[] = (response.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ?? undefined,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));

    this.logger.log(
      `Listed ${files.length} files from Google Drive folder ${folderId || 'root'}`,
    );
    return { files };
  }

  /**
   * Download a file from Google Drive to a local path.
   */
  private async downloadFile(
    drive: drive_v3.Drive,
    fileId: string,
    destinationPath: string,
  ): Promise<string> {
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name, mimeType, size',
    });

    this.logger.log(
      `Downloading file ${fileMetadata.data.name} (${fileMetadata.data.size} bytes) from Google Drive`,
    );

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );

    const dest = fsSync.createWriteStream(destinationPath);

    return new Promise((resolve, reject) => {
      (response.data as any)
        .on('end', () => {
          this.logger.log(
            `File downloaded successfully to ${destinationPath}`,
          );
          resolve(destinationPath);
        })
        .on('error', (err: Error) => {
          this.logger.error('Error downloading file:', err.message);
          reject(err);
        })
        .pipe(dest);
    });
  }

  /**
   * Import a single video from Google Drive into the system.
   * On serverless (Vercel), files are NOT downloaded at import time.
   * Instead, the Drive file ID is stored and the file is downloaded
   * on-demand when publishing.
   */
  async importVideo(userId: string, fileId: string, title?: string) {
    if (!fileId) {
      throw new BadRequestException('File ID is required');
    }

    const auth = await this.getAuthenticatedClient(userId);
    const drive = this.getDriveClient(auth);

    // Get file metadata (quick API call)
    const fileMetadata = await this.getFileMetadataFromDrive(drive, fileId);

    // Check for duplicate import (same user + same driveFileId)
    const existing = await this.prisma.video.findFirst({
      where: {
        userId,
        metadata: { path: ['driveFileId'], equals: fileId },
      },
    });
    if (existing) {
      return {
        message: 'Video already imported from Google Drive',
        video: existing,
      };
    }

    // Create video record as READY — file will be downloaded on-demand at publish time
    const video = await this.prisma.video.create({
      data: {
        userId,
        title: title || fileMetadata.name,
        sourceType: 'MANUAL',
        status: 'READY',
        fileSize: fileMetadata.size ? BigInt(fileMetadata.size) : BigInt(0),
        metadata: {
          driveFileId: fileId,
          driveFileName: fileMetadata.name,
          driveMimeType: fileMetadata.mimeType,
          importedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`Video imported from Google Drive: ${video.id} (${fileMetadata.name})`);

    return {
      message: 'Video imported from Google Drive',
      video,
    };
  }

  /**
   * Download a Drive file to a temp path on-demand (used at publish time).
   * Returns the local temp file path.
   */
  async downloadToTemp(userId: string, driveFileId: string, fileName?: string): Promise<string> {
    const auth = await this.getAuthenticatedClient(userId);
    const drive = this.getDriveClient(auth);

    const tempDir = '/tmp/drive-imports';
    await fs.mkdir(tempDir, { recursive: true });
    const safeName = fileName || `drive-${driveFileId}`;
    const tempFilePath = path.join(tempDir, `${Date.now()}-${safeName}`);

    this.logger.log(`Downloading Drive file ${driveFileId} to ${tempFilePath}`);
    await this.downloadFile(drive, driveFileId, tempFilePath);
    this.logger.log(`Drive file downloaded: ${tempFilePath}`);

    return tempFilePath;
  }

  /**
   * Import multiple videos from Google Drive (max 10 at once).
   * Creates video records immediately and downloads in background.
   */
  async importMultiple(userId: string, fileIds: string[]) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new BadRequestException('File IDs array is required');
    }

    if (fileIds.length > 10) {
      throw new BadRequestException(
        'Maximum 10 files can be imported at once',
      );
    }

    const auth = await this.getAuthenticatedClient(userId);
    const drive = this.getDriveClient(auth);
    const results: Array<{
      success: boolean;
      fileId: string;
      videoId?: string;
      fileName?: string;
      error?: string;
    }> = [];

    for (const fileId of fileIds) {
      try {
        const fileMetadata = await this.getFileMetadataFromDrive(drive, fileId);

        // Create video record as READY (download on-demand at publish time)
        const video = await this.prisma.video.create({
          data: {
            userId,
            title: fileMetadata.name,
            sourceType: 'MANUAL',
            status: 'READY',
            fileSize: fileMetadata.size ? BigInt(fileMetadata.size) : BigInt(0),
            metadata: {
              driveFileId: fileId,
              driveFileName: fileMetadata.name,
              driveMimeType: fileMetadata.mimeType,
              importedAt: new Date().toISOString(),
            },
          },
        });

        results.push({
          success: true,
          fileId,
          videoId: video.id,
          fileName: fileMetadata.name,
        });
      } catch (error: any) {
        this.logger.error(`Error creating import for file ${fileId}: ${error.message}`);
        results.push({
          success: false,
          fileId,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return {
      message: `Started import for ${successCount} of ${fileIds.length} videos`,
      results,
    };
  }

  /**
   * Get metadata for a specific file in Google Drive.
   */
  async getFileMetadata(
    userId: string,
    fileId: string,
  ): Promise<{ file: DriveFile }> {
    const auth = await this.getAuthenticatedClient(userId);
    const drive = this.getDriveClient(auth);

    const file = await this.getFileMetadataFromDrive(drive, fileId);
    return { file };
  }

  /**
   * Internal helper: fetch file metadata from the Drive API.
   */
  private async getFileMetadataFromDrive(
    drive: drive_v3.Drive,
    fileId: string,
  ): Promise<DriveFile> {
    const response = await drive.files.get({
      fileId,
      fields:
        'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
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
      isFolder:
        response.data.mimeType === 'application/vnd.google-apps.folder',
    };
  }
}
