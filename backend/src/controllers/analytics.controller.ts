import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler.middleware';
import { getAnalyticsSummary, syncPostAnalytics } from '../services/analytics/sync';
import { analyticsSyncQueue } from '../config/queue';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  platform: z.enum(['INSTAGRAM', 'FACEBOOK', 'YOUTUBE']).optional(),
});

/**
 * Get analytics summary for user
 */
export const getAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = analyticsQuerySchema.parse(req.query);

    // Default to last 30 days if no dates provided
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const summary = await getAnalyticsSummary(req.user!.id, startDate, endDate);

    // Filter by platform if specified
    if (query.platform) {
      const platformData = summary.byPlatform[query.platform] || {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        posts: 0,
      };

      const platformTimeline = summary.timeline.filter(
        (item) => item.platform === query.platform
      );

      res.json({
        summary: {
          platform: query.platform,
          ...platformData,
        },
        timeline: platformTimeline,
      });
    } else {
      res.json({
        summary: summary.totals,
        byPlatform: summary.byPlatform,
        timeline: summary.timeline,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics for a specific post
 */
export const getPostAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { postId } = req.params;

    // Verify post belongs to user
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: req.user!.id,
      },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Get analytics records for this post
    const analytics = await prisma.analytics.findMany({
      where: { postId },
      orderBy: { metricsDate: 'desc' },
    });

    if (analytics.length === 0) {
      res.json({
        message: 'No analytics data available for this post',
        analytics: [],
      });
      return;
    }

    // Get latest analytics
    const latest = analytics[0];

    res.json({
      postId,
      latest: {
        views: latest.views,
        likes: latest.likes,
        comments: latest.comments,
        shares: latest.shares,
        engagementRate: latest.engagementRate,
        metricsDate: latest.metricsDate,
      },
      history: analytics.map((a) => ({
        views: a.views,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        engagementRate: a.engagementRate,
        date: a.metricsDate,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger analytics sync for a post
 */
export const syncPostAnalyticsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { postId } = req.params;

    // Verify post belongs to user
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: req.user!.id,
      },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new AppError(400, 'Can only sync analytics for published posts');
    }

    // Queue analytics sync job
    await analyticsSyncQueue.add(
      { postId: post.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );

    res.json({
      message: 'Analytics sync queued',
      postId: post.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top performing posts
 */
export const getTopPerformingPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metric = (req.query.metric as string) || 'engagementRate';

    // Validate metric
    const validMetrics = ['views', 'likes', 'comments', 'shares', 'engagementRate'];
    if (!validMetrics.includes(metric)) {
      throw new AppError(400, `Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
    }

    // Get latest analytics for each post
    const posts = await prisma.post.findMany({
      where: {
        userId: req.user!.id,
        status: 'PUBLISHED',
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        analytics: {
          orderBy: { metricsDate: 'desc' },
          take: 1,
        },
      },
    });

    // Filter posts with analytics and sort by metric
    const postsWithAnalytics = posts
      .filter((post) => post.analytics.length > 0)
      .map((post) => ({
        id: post.id,
        video: post.video,
        platform: post.platform,
        postType: post.postType,
        caption: post.caption,
        publishedAt: post.publishedAt,
        platformUrl: post.platformUrl,
        analytics: {
          views: post.analytics[0].views,
          likes: post.analytics[0].likes,
          comments: post.analytics[0].comments,
          shares: post.analytics[0].shares,
          engagementRate: post.analytics[0].engagementRate,
          metricsDate: post.analytics[0].metricsDate,
        },
      }))
      .sort((a, b) => {
        const aValue = a.analytics[metric as keyof typeof a.analytics] as number;
        const bValue = b.analytics[metric as keyof typeof b.analytics] as number;
        return bValue - aValue;
      })
      .slice(0, limit);

    res.json({
      metric,
      posts: postsWithAnalytics,
    });
  } catch (error) {
    next(error);
  }
};
