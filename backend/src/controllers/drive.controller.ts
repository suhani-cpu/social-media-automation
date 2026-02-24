import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { getAuthUrl, handleCallback, disconnectDrive, resolveState } from '../services/auth/drive-oauth';
import { DriveStorageService } from '../services/google-drive/drive-storage.service';
import { prisma } from '../config/database';
import path from 'path';
import fs from 'fs/promises';

/**
 * Start Google Drive OAuth flow
 */
export const startDriveAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const authUrl = await getAuthUrl(userId);

    res.json({
      message: 'Authorization URL generated',
      authUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Google Drive OAuth callback
 */
export const handleDriveCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      throw new AppError(400, `Google OAuth error: ${oauthError}`);
    }

    if (!code || !state) {
      throw new AppError(400, 'Missing code or state parameter');
    }

    // Resolve CSRF state token to userId
    const userId = resolveState(state as string);
    await handleCallback(code as string, userId);

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/accounts?drive=connected`);
  } catch (error: any) {
    console.error('DRIVE CALLBACK ERROR:', error?.message || error);
    console.error('DRIVE CALLBACK FULL ERROR:', JSON.stringify(error?.response?.data || error?.message || error));
    const errorMsg = encodeURIComponent(error?.message || 'Unknown error');
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/accounts?drive=error&drive_error=${errorMsg}`);
  }
};

/**
 * Get Drive connection status
 */
export const getDriveStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.json({ connected: false, account: null });
    }

    const account = await prisma.socialAccount.findFirst({
      where: {
        userId: req.user.id,
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

    res.json({
      connected: !!account,
      account: account || null,
    });
  } catch (error) {
    console.error('DRIVE STATUS ERROR:', error);
    next(error);
  }
};

/**
 * Disconnect Google Drive
 */
export const disconnectDriveAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await disconnectDrive(req.user!.id);

    res.json({
      message: 'Google Drive disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List folders in Google Drive
 */
export const listDriveFolders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { parentId } = req.query;

    const driveService = new DriveStorageService(req.user!.id);
    const folders = await driveService.listFolders(parentId as string | undefined);

    res.json({
      folders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List files in a Google Drive folder
 */
export const listDriveFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { folderId, videosOnly = 'true' } = req.query;

    const driveService = new DriveStorageService(req.user!.id);
    const files = await driveService.listFiles(
      folderId as string | undefined,
      videosOnly === 'true'
    );

    res.json({
      files,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import video from Google Drive
 */
export const importVideoFromDrive = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId, title } = req.body;

    if (!fileId) {
      throw new AppError(400, 'File ID is required');
    }

    const driveService = new DriveStorageService(req.user!.id);

    // Get file metadata
    const fileMetadata = await driveService.getFileMetadata(fileId);

    // Download file to temporary location
    const tempDir = '/tmp/drive-imports';
    await fs.mkdir(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileMetadata.name}`);
    await driveService.downloadFile(fileId, tempFilePath);

    // Get file stats
    const stats = await fs.stat(tempFilePath);

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: req.user!.id,
        title: title || fileMetadata.name,
        sourceType: 'MANUAL',
        status: 'PENDING',
        rawVideoUrl: tempFilePath,
        fileSize: stats.size,
        metadata: {
          driveFileId: fileId,
          driveFileName: fileMetadata.name,
          importedAt: new Date().toISOString(),
        },
      },
    });

    logger.info(`Video imported from Google Drive: ${video.id}`);

    res.status(201).json({
      message: 'Video imported successfully from Google Drive',
      video,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import multiple videos from Google Drive
 */
export const importMultipleVideos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new AppError(400, 'File IDs array is required');
    }

    if (fileIds.length > 10) {
      throw new AppError(400, 'Maximum 10 files can be imported at once');
    }

    const driveService = new DriveStorageService(req.user!.id);
    const results = [];

    for (const fileId of fileIds) {
      try {
        // Get file metadata
        const fileMetadata = await driveService.getFileMetadata(fileId);

        // Download file
        const tempDir = '/tmp/drive-imports';
        await fs.mkdir(tempDir, { recursive: true });
        const tempFilePath = path.join(tempDir, `${Date.now()}-${fileMetadata.name}`);
        await driveService.downloadFile(fileId, tempFilePath);

        // Get file stats
        const stats = await fs.stat(tempFilePath);

        // Create video record
        const video = await prisma.video.create({
          data: {
            userId: req.user!.id,
            title: fileMetadata.name,
            sourceType: 'MANUAL',
            status: 'PENDING',
            rawVideoUrl: tempFilePath,
            fileSize: stats.size,
            metadata: {
              driveFileId: fileId,
              driveFileName: fileMetadata.name,
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
        logger.error(`Error importing file ${fileId}:`, error);
        results.push({
          success: false,
          fileId,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    res.status(201).json({
      message: `Imported ${successCount} of ${fileIds.length} videos successfully`,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get file metadata from Google Drive
 */
export const getDriveFileMetadata = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;

    const driveService = new DriveStorageService(req.user!.id);
    const metadata = await driveService.getFileMetadata(fileId);

    res.json({
      file: metadata,
    });
  } catch (error) {
    next(error);
  }
};
