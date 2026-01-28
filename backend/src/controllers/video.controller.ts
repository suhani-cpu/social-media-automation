import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler.middleware';
import { videoProcessingQueue } from '../config/queue';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

export const uploadVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No video file uploaded');
    }

    const { title, description, language } = req.body;

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: req.user!.id,
        title: title || 'Untitled Video',
        description,
        language: language || 'HINGLISH',
        sourceType: 'MANUAL',
        status: 'PENDING',
        rawVideoUrl: req.file.path,
      },
    });

    // Trigger video processing job
    await videoProcessingQueue.add(
      {
        videoId: video.id,
        userId: req.user!.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    logger.info(`Video processing job queued for video ${video.id}`);

    res.status(201).json({
      message: 'Video uploaded successfully',
      video,
    });
  } catch (error) {
    next(error);
  }
};

export const getVideos = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const videos = await prisma.video.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        thumbnailUrl: true,
        duration: true,
        createdAt: true,
      },
    });

    res.json({ videos });
  } catch (error) {
    next(error);
  }
};

export const getVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const video = await prisma.video.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!video) {
      throw new AppError(404, 'Video not found');
    }

    res.json({ video });
  } catch (error) {
    next(error);
  }
};
