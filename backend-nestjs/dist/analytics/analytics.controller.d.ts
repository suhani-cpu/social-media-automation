import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getSummary(user: CurrentUserPayload, startDate?: string, endDate?: string, platform?: string): Promise<{
        summary: {
            views: number;
            likes: number;
            comments: number;
            shares: number;
            posts: number;
            platform: string;
        };
        timeline: {
            date: Date;
            views: number;
            likes: number;
            comments: number;
            shares: number;
            engagementRate: number;
            platform: import(".prisma/client").$Enums.Platform;
        }[];
        byPlatform?: undefined;
    } | {
        summary: {
            avgEngagementRate: number;
            views: number;
            likes: number;
            comments: number;
            shares: number;
            posts: number;
        };
        byPlatform: Record<string, {
            views: number;
            likes: number;
            comments: number;
            shares: number;
            posts: number;
        }>;
        timeline: {
            date: Date;
            views: number;
            likes: number;
            comments: number;
            shares: number;
            engagementRate: number;
            platform: import(".prisma/client").$Enums.Platform;
        }[];
    }>;
    getTopPerforming(user: CurrentUserPayload, limit?: string, metric?: string): Promise<{
        metric: string;
        posts: {
            id: string;
            video: {
                id: string;
                title: string;
                thumbnailUrl: string | null;
            } | null;
            platform: import(".prisma/client").$Enums.Platform;
            postType: import(".prisma/client").$Enums.PostType;
            caption: string;
            publishedAt: Date | null;
            platformUrl: string | null;
            analytics: {
                views: number;
                likes: number;
                comments: number;
                shares: number;
                engagementRate: number;
                metricsDate: Date;
            };
        }[];
    }>;
    getPostAnalytics(user: CurrentUserPayload, postId: string): Promise<{
        message: string;
        analytics: never[];
        postId?: undefined;
        latest?: undefined;
        history?: undefined;
    } | {
        postId: string;
        latest: {
            views: number;
            likes: number;
            comments: number;
            shares: number;
            engagementRate: number;
            metricsDate: Date;
        };
        history: {
            views: number;
            likes: number;
            comments: number;
            shares: number;
            engagementRate: number;
            date: Date;
        }[];
        message?: undefined;
        analytics?: undefined;
    }>;
    syncPostAnalytics(user: CurrentUserPayload, postId: string): Promise<{
        message: string;
        postId: string;
    }>;
    getBestTimes(user: CurrentUserPayload, platform?: string): Promise<{
        suggestion: string;
        bestHours: {
            hour: number;
            avgViews: number;
            avgEngagement: number;
            postsAnalyzed: number;
        }[];
        bestDays: {
            day: string;
            dayIndex: number;
            avgViews: number;
            avgEngagement: number;
            postsAnalyzed: number;
        }[];
        postsAnalyzed: number;
        defaultSuggestions: string[];
        hasEnoughData: boolean;
    }>;
    getInsights(user: CurrentUserPayload): Promise<{
        platforms: {
            platform: string;
            avgViews: number;
            avgEngagement: number;
        }[];
        postTypes: {
            type: string;
            avgViews: number;
            avgEngagement: number;
        }[];
        insights: string[];
        totalPublished: number;
    }>;
}
