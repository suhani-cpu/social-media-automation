import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler.middleware';
import { publishToInstagram } from '../services/social-media/instagram/client';
import { publishToYouTube } from '../services/social-media/youtube/client';
import { publishToFacebook } from '../services/social-media/facebook/client';
import { getScheduledPostsSummary, reschedulePost } from '../services/scheduler';
import { generateCaption } from '../services/caption/generator';
import { z } from 'zod';

const createPostSchema = z.object({
  videoId: z.string().uuid(),
  accountId: z.string().uuid(),
  caption: z.string(),
  language: z.enum(['ENGLISH', 'HINGLISH', 'HARYANVI', 'HINDI']),
  hashtags: z.array(z.string()).optional(),
  platform: z.enum(['INSTAGRAM', 'FACEBOOK', 'YOUTUBE']),
  postType: z.enum(['FEED', 'REEL', 'STORY', 'VIDEO', 'SHORT']),
  scheduledFor: z.string().datetime().optional(),
});

export const createPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createPostSchema.parse(req.body);

    // Verify video exists and belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id: data.videoId,
        userId: req.user!.id,
      },
    });

    if (!video) {
      throw new AppError(404, 'Video not found');
    }

    // Verify account exists and belongs to user
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: data.accountId,
        userId: req.user!.id,
      },
    });

    if (!account) {
      throw new AppError(404, 'Social account not found');
    }

    const post = await prisma.post.create({
      data: {
        userId: req.user!.id,
        videoId: data.videoId,
        accountId: data.accountId,
        caption: data.caption,
        language: data.language,
        hashtags: data.hashtags || [],
        platform: data.platform,
        postType: data.postType,
        status: data.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      },
    });

    res.status(201).json({
      message: 'Post created successfully',
      post,
    });
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const posts = await prisma.post.findMany({
      where: { userId: req.user!.id },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ posts });
  } catch (error) {
    next(error);
  }
};

export const publishPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const post = await prisma.post.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        video: true,
        account: true,
      },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Update status to publishing
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHING' },
    });

    // Publish based on platform
    try {
      if (post.platform === 'INSTAGRAM') {
        const result = await publishToInstagram(post, post.video!, post.account);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            platformPostId: result.id,
            platformUrl: result.permalink,
          },
        });
      } else if (post.platform === 'YOUTUBE') {
        const result = await publishToYouTube(post, post.video!, post.account);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            platformPostId: result.id,
            platformUrl: result.url,
          },
        });
      } else if (post.platform === 'FACEBOOK') {
        const result = await publishToFacebook(post, post.video!, post.account);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            platformPostId: result.id,
            platformUrl: result.permalink,
          },
        });
      } else {
        throw new AppError(400, `Unsupported platform: ${post.platform}`);
      }

      res.json({
        message: 'Post published successfully',
        post,
      });
    } catch (publishError: any) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          errorMessage: publishError.message,
        },
      });
      throw publishError;
    }
  } catch (error) {
    next(error);
  }
};

export const getScheduledSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const summary = await getScheduledPostsSummary();

    res.json({
      message: 'Scheduled posts summary',
      summary,
    });
  } catch (error) {
    next(error);
  }
};

export const reschedulePostController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { scheduledFor } = req.body;

    if (!scheduledFor) {
      throw new AppError(400, 'scheduledFor is required');
    }

    // Verify post belongs to user
    const post = await prisma.post.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    await reschedulePost(post.id, new Date(scheduledFor));

    res.json({
      message: 'Post rescheduled successfully',
      scheduledFor: new Date(scheduledFor),
    });
  } catch (error) {
    next(error);
  }
};

const generateCaptionSchema = z.object({
  videoTitle: z.string().min(1),
  videoDescription: z.string().optional(),
  platform: z.enum(['INSTAGRAM', 'FACEBOOK', 'YOUTUBE']),
  language: z.enum(['ENGLISH', 'HINGLISH', 'HARYANVI', 'HINDI']),
  tone: z.array(z.string()).optional(),
  context: z.string().optional(),
});

export const generateCaptionController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = generateCaptionSchema.parse(req.body);

    const variations = await generateCaption({
      videoTitle: data.videoTitle,
      videoDescription: data.videoDescription,
      platform: data.platform,
      language: data.language,
      tone: data.tone || ['engaging'],
      context: data.context,
    });

    res.json({ variations });
  } catch (error) {
    next(error);
  }
};
