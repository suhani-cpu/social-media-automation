import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { getInstagramMediaInsights } from '../social-media/instagram/analytics';
import { getYouTubeAnalytics } from '../social-media/youtube/analytics';
import { getFacebookInsights } from '../social-media/facebook/analytics';

export interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Sync analytics for a specific post
 */
export async function syncPostAnalytics(postId: string): Promise<void> {
  try {
    logger.info(`Syncing analytics for post ${postId}`);

    // Fetch post with related data
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        account: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (post.status !== 'PUBLISHED' || !post.platformPostId) {
      logger.debug(`Post ${postId} is not published or missing platformPostId, skipping analytics sync`);
      return;
    }

    // Fetch analytics based on platform
    let analyticsData: AnalyticsData;

    switch (post.platform) {
      case 'INSTAGRAM':
        analyticsData = await getInstagramMediaInsights(post.platformPostId, post.account.accessToken);
        break;

      case 'YOUTUBE':
        analyticsData = await getYouTubeAnalytics(post.platformPostId, post.account.id);
        break;

      case 'FACEBOOK':
        analyticsData = await getFacebookInsights(post.platformPostId, post.account.accessToken);
        break;

      default:
        throw new Error(`Unsupported platform: ${post.platform}`);
    }

    // Calculate engagement
    const engagement = analyticsData.likes + analyticsData.comments + analyticsData.shares;

    // Store analytics data
    await prisma.analytics.create({
      data: {
        postId: post.id,
        accountId: post.accountId,
        views: analyticsData.views,
        likes: analyticsData.likes,
        comments: analyticsData.comments,
        shares: analyticsData.shares,
        engagement,
        metricsDate: new Date(),
      },
    });

    logger.info(`Analytics synced for post ${postId}`, {
      platform: post.platform,
      views: analyticsData.views,
      likes: analyticsData.likes,
      comments: analyticsData.comments,
      shares: analyticsData.shares,
      engagement,
    });
  } catch (error) {
    logger.error(`Failed to sync analytics for post ${postId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Sync analytics for multiple posts
 */
export async function syncMultiplePostsAnalytics(postIds: string[]): Promise<void> {
  logger.info(`Syncing analytics for ${postIds.length} posts`);

  const results = await Promise.allSettled(
    postIds.map((postId) => syncPostAnalytics(postId))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  logger.info('Bulk analytics sync completed', {
    total: postIds.length,
    succeeded,
    failed,
  });
}

/**
 * Get analytics summary for a date range
 */
export async function getAnalyticsSummary(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const analytics = await prisma.analytics.findMany({
    where: {
      post: {
        userId,
      },
      metricsDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      post: {
        select: {
          platform: true,
          postType: true,
        },
      },
    },
  });

  // Aggregate totals
  const totals = analytics.reduce(
    (acc, curr) => ({
      views: acc.views + curr.views,
      likes: acc.likes + curr.likes,
      comments: acc.comments + curr.comments,
      shares: acc.shares + curr.shares,
      engagement: acc.engagement + curr.engagement,
      posts: acc.posts + 1,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, posts: 0 }
  );

  // Calculate average engagement
  const avgEngagement =
    analytics.length > 0
      ? analytics.reduce((acc, curr) => acc + curr.engagement, 0) / analytics.length
      : 0;

  // Group by platform
  const byPlatform = analytics.reduce((acc, curr) => {
    const platform = curr.post.platform;
    if (!acc[platform]) {
      acc[platform] = { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, posts: 0 };
    }
    acc[platform].views += curr.views;
    acc[platform].likes += curr.likes;
    acc[platform].comments += curr.comments;
    acc[platform].shares += curr.shares;
    acc[platform].engagement += curr.engagement;
    acc[platform].posts += 1;
    return acc;
  }, {} as Record<string, { views: number; likes: number; comments: number; shares: number; engagement: number; posts: number }>);

  return {
    totals: {
      ...totals,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
    },
    byPlatform,
    timeline: analytics.map((a) => ({
      date: a.metricsDate,
      views: a.views,
      likes: a.likes,
      comments: a.comments,
      shares: a.shares,
      engagement: a.engagement,
      platform: a.post.platform,
    })),
  };
}
