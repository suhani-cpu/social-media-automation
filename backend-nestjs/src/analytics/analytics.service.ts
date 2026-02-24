import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';

export interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('analytics-sync') private readonly analyticsSyncQueue: Queue,
  ) {}

  /**
   * Get analytics summary for a user within a date range.
   * Defaults to the last 30 days when dates are not provided.
   */
  async getSummary(userId: string, startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const analytics = await this.prisma.analytics.findMany({
      where: {
        post: { userId },
        metricsDate: {
          gte: start,
          lte: end,
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
        posts: acc.posts + 1,
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 },
    );

    // Calculate average engagement rate
    const avgEngagementRate =
      analytics.length > 0
        ? analytics.reduce((acc, curr) => acc + curr.engagement, 0) /
          analytics.length
        : 0;

    // Group by platform
    const byPlatform = analytics.reduce(
      (acc, curr) => {
        const platform = curr.post.platform;
        if (!acc[platform]) {
          acc[platform] = {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            posts: 0,
          };
        }
        acc[platform].views += curr.views;
        acc[platform].likes += curr.likes;
        acc[platform].comments += curr.comments;
        acc[platform].shares += curr.shares;
        acc[platform].posts += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          views: number;
          likes: number;
          comments: number;
          shares: number;
          posts: number;
        }
      >,
    );

    // Build timeline
    const timeline = analytics.map((a) => ({
      date: a.metricsDate,
      views: a.views,
      likes: a.likes,
      comments: a.comments,
      shares: a.shares,
      engagementRate: a.engagement,
      platform: a.post.platform,
    }));

    return {
      summary: {
        ...totals,
        avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      },
      byPlatform,
      timeline,
    };
  }

  /**
   * Get analytics for a specific post belonging to a user.
   */
  async getPostAnalytics(userId: string, postId: string) {
    // Verify post belongs to user
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Get analytics records for this post
    const analytics = await this.prisma.analytics.findMany({
      where: { postId },
      orderBy: { metricsDate: 'desc' },
    });

    if (analytics.length === 0) {
      return {
        message: 'No analytics data available for this post',
        analytics: [],
      };
    }

    const latest = analytics[0];

    return {
      postId,
      latest: {
        views: latest.views,
        likes: latest.likes,
        comments: latest.comments,
        shares: latest.shares,
        engagementRate: latest.engagement,
        metricsDate: latest.metricsDate,
      },
      history: analytics.map((a) => ({
        views: a.views,
        likes: a.likes,
        comments: a.comments,
        shares: a.shares,
        engagementRate: a.engagement,
        date: a.metricsDate,
      })),
    };
  }

  /**
   * Queue an analytics sync job for a published post.
   */
  async syncPostAnalytics(userId: string, postId: string) {
    // Verify post belongs to user
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Can only sync analytics for published posts',
      );
    }

    // Queue analytics sync job
    await this.analyticsSyncQueue.add(
      { postId: post.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Analytics sync queued for post ${post.id}`);

    return {
      message: 'Analytics sync queued',
      postId: post.id,
    };
  }

  /**
   * Get top performing posts sorted by a given metric.
   */
  async getTopPerforming(
    userId: string,
    limit: number = 10,
    metric: string = 'engagementRate',
  ) {
    const validMetrics = [
      'views',
      'likes',
      'comments',
      'shares',
      'engagementRate',
    ];

    if (!validMetrics.includes(metric)) {
      throw new BadRequestException(
        `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      );
    }

    // Get latest analytics for each published post
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
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

    // Filter posts with analytics and sort by the requested metric
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
          engagementRate: post.analytics[0].engagement,
          metricsDate: post.analytics[0].metricsDate,
        },
      }))
      .sort((a, b) => {
        const aValue = a.analytics[
          metric as keyof typeof a.analytics
        ] as number;
        const bValue = b.analytics[
          metric as keyof typeof b.analytics
        ] as number;
        return bValue - aValue;
      })
      .slice(0, limit);

    return {
      metric,
      posts: postsWithAnalytics,
    };
  }

  /**
   * Suggest best posting times based on historical analytics data.
   */
  async getBestTimes(userId: string, platform?: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        status: 'PUBLISHED',
        publishedAt: { not: null },
        ...(platform ? { platform: platform as any } : {}),
      },
      include: {
        analytics: {
          orderBy: { metricsDate: 'desc' },
          take: 1,
        },
      },
    });

    // Group by hour of day and day of week
    const hourStats: Record<number, { total: number; engagement: number; count: number }> = {};
    const dayStats: Record<number, { total: number; engagement: number; count: number }> = {};

    for (const post of posts) {
      if (!post.publishedAt || post.analytics.length === 0) continue;

      const date = new Date(post.publishedAt);
      const hour = date.getHours();
      const day = date.getDay();
      const views = post.analytics[0].views;
      const engagement = post.analytics[0].engagement;

      if (!hourStats[hour]) hourStats[hour] = { total: 0, engagement: 0, count: 0 };
      hourStats[hour].total += views;
      hourStats[hour].engagement += engagement;
      hourStats[hour].count++;

      if (!dayStats[day]) dayStats[day] = { total: 0, engagement: 0, count: 0 };
      dayStats[day].total += views;
      dayStats[day].engagement += engagement;
      dayStats[day].count++;
    }

    // Find best hours
    const bestHours = Object.entries(hourStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        avgViews: Math.round(stats.total / stats.count),
        avgEngagement: Math.round((stats.engagement / stats.count) * 100) / 100,
        postsAnalyzed: stats.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);

    // Find best days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDays = Object.entries(dayStats)
      .map(([day, stats]) => ({
        day: dayNames[parseInt(day)],
        dayIndex: parseInt(day),
        avgViews: Math.round(stats.total / stats.count),
        avgEngagement: Math.round((stats.engagement / stats.count) * 100) / 100,
        postsAnalyzed: stats.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Generate suggestion
    const suggestion = bestHours.length > 0 && bestDays.length > 0
      ? `Best time: ${bestDays[0].day} at ${bestHours[0].hour}:00 (${bestHours[0].avgEngagement}% avg engagement)`
      : 'Not enough data yet. Post more to get personalized suggestions!';

    // Platform-specific defaults when no data
    const defaultTimes: Record<string, string[]> = {
      YOUTUBE: ['Tuesday 5:00 PM', 'Thursday 3:00 PM', 'Saturday 11:00 AM'],
      INSTAGRAM: ['Monday 11:00 AM', 'Wednesday 7:00 PM', 'Friday 10:00 AM'],
      FACEBOOK: ['Wednesday 1:00 PM', 'Thursday 12:00 PM', 'Friday 3:00 PM'],
    };

    return {
      suggestion,
      bestHours,
      bestDays,
      postsAnalyzed: posts.length,
      defaultSuggestions: platform ? (defaultTimes[platform] || []) : [],
      hasEnoughData: posts.length >= 5,
    };
  }

  /**
   * Get performance insights - which platform/postType performs best.
   */
  async getInsights(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: { userId, status: 'PUBLISHED' },
      include: {
        analytics: { orderBy: { metricsDate: 'desc' }, take: 1 },
      },
    });

    // Platform comparison
    const platformStats: Record<string, { views: number; engagement: number; count: number }> = {};
    const postTypeStats: Record<string, { views: number; engagement: number; count: number }> = {};

    for (const post of posts) {
      if (post.analytics.length === 0) continue;
      const a = post.analytics[0];

      if (!platformStats[post.platform]) platformStats[post.platform] = { views: 0, engagement: 0, count: 0 };
      platformStats[post.platform].views += a.views;
      platformStats[post.platform].engagement += a.engagement;
      platformStats[post.platform].count++;

      if (!postTypeStats[post.postType]) postTypeStats[post.postType] = { views: 0, engagement: 0, count: 0 };
      postTypeStats[post.postType].views += a.views;
      postTypeStats[post.postType].engagement += a.engagement;
      postTypeStats[post.postType].count++;
    }

    const insights: string[] = [];

    // Platform insights
    const platforms = Object.entries(platformStats).map(([p, s]) => ({
      platform: p,
      avgViews: Math.round(s.views / s.count),
      avgEngagement: Math.round((s.engagement / s.count) * 100) / 100,
    }));
    if (platforms.length >= 2) {
      platforms.sort((a, b) => b.avgViews - a.avgViews);
      const ratio = platforms[0].avgViews / Math.max(platforms[1].avgViews, 1);
      insights.push(`Your ${platforms[0].platform} posts get ${ratio.toFixed(1)}x more views than ${platforms[1].platform}`);
    }

    // Post type insights
    const types = Object.entries(postTypeStats).map(([t, s]) => ({
      type: t,
      avgViews: Math.round(s.views / s.count),
      avgEngagement: Math.round((s.engagement / s.count) * 100) / 100,
    }));
    if (types.length >= 2) {
      types.sort((a, b) => b.avgEngagement - a.avgEngagement);
      insights.push(`${types[0].type} posts have the highest engagement (${types[0].avgEngagement}%)`);
    }

    return {
      platforms,
      postTypes: types,
      insights,
      totalPublished: posts.length,
    };
  }
}
