import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
export interface AnalyticsData {
    views: number;
    likes: number;
    comments: number;
    shares: number;
}
export declare class AnalyticsService {
    private readonly prisma;
    private readonly analyticsSyncQueue;
    private readonly logger;
    constructor(prisma: PrismaService, analyticsSyncQueue: Queue);
    getSummary(userId: string, startDate?: string, endDate?: string): Promise<{
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
    getPostAnalytics(userId: string, postId: string): Promise<{
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
    syncPostAnalytics(userId: string, postId: string): Promise<{
        message: string;
        postId: string;
    }>;
    getTopPerforming(userId: string, limit?: number, metric?: string): Promise<{
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
    getBestTimes(userId: string, platform?: string): Promise<{
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
    getInsights(userId: string): Promise<{
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
