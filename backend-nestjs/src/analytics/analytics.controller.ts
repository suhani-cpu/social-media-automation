import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics
   * Get analytics summary for the authenticated user.
   * Query params: startDate, endDate, platform (optional filter).
   */
  @Get()
  async getSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('platform') platform?: string,
  ) {
    const result = await this.analyticsService.getSummary(
      user.id,
      startDate,
      endDate,
    );

    // Filter by platform if specified
    if (platform) {
      const platformData = result.byPlatform[platform] || {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        posts: 0,
      };

      const platformTimeline = result.timeline.filter(
        (item) => item.platform === platform,
      );

      return {
        summary: {
          platform,
          ...platformData,
        },
        timeline: platformTimeline,
      };
    }

    return {
      summary: result.summary,
      byPlatform: result.byPlatform,
      timeline: result.timeline,
    };
  }

  /**
   * GET /analytics/top
   * Get top performing posts by a given metric.
   * Query params: limit (default 10), metric (default engagementRate).
   */
  @Get('top')
  getTopPerforming(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
    @Query('metric') metric?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) || 10 : 10;
    return this.analyticsService.getTopPerforming(
      user.id,
      parsedLimit,
      metric || 'engagementRate',
    );
  }

  /**
   * GET /analytics/posts/:postId
   * Get analytics for a specific post.
   */
  @Get('posts/:postId')
  getPostAnalytics(
    @CurrentUser() user: CurrentUserPayload,
    @Param('postId') postId: string,
  ) {
    return this.analyticsService.getPostAnalytics(user.id, postId);
  }

  /**
   * POST /analytics/posts/:postId/sync
   * Trigger an analytics sync for a specific post.
   */
  @Post('posts/:postId/sync')
  syncPostAnalytics(
    @CurrentUser() user: CurrentUserPayload,
    @Param('postId') postId: string,
  ) {
    return this.analyticsService.syncPostAnalytics(user.id, postId);
  }

  @Get('best-times')
  getBestTimes(
    @CurrentUser() user: CurrentUserPayload,
    @Query('platform') platform?: string,
  ) {
    return this.analyticsService.getBestTimes(user.id, platform);
  }

  @Get('insights')
  getInsights(@CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.getInsights(user.id);
  }
}
