import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  startDriveAuth,
  handleDriveCallback,
  getDriveStatus,
  disconnectDriveAccount,
  listDriveFolders,
  listDriveFiles,
  importVideoFromDrive,
  importMultipleVideos,
  getDriveFileMetadata,
} from '../controllers/drive.controller';

export const driveRoutes = Router();

// OAuth routes
driveRoutes.get('/auth', authMiddleware, startDriveAuth);
driveRoutes.get('/callback', handleDriveCallback);

// Status and management
driveRoutes.use(authMiddleware);
driveRoutes.get('/status', getDriveStatus);
driveRoutes.post('/disconnect', disconnectDriveAccount);

// Browse Drive
driveRoutes.get('/folders', listDriveFolders);
driveRoutes.get('/files', listDriveFiles);
driveRoutes.get('/files/:fileId', getDriveFileMetadata);

// Import videos
driveRoutes.post('/import', importVideoFromDrive);
driveRoutes.post('/import/multiple', importMultipleVideos);
