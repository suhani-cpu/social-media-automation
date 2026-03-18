"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(prisma, analyticsSyncQueue) {
        this.prisma = prisma;
        this.analyticsSyncQueue = analyticsSyncQueue;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
    }
    async getSummary(userId, startDate, endDate) {
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
        const totals = analytics.reduce((acc, curr) => ({
            views: acc.views + curr.views,
            likes: acc.likes + curr.likes,
            comments: acc.comments + curr.comments,
            shares: acc.shares + curr.shares,
            posts: acc.posts + 1,
        }), { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });
        const avgEngagementRate = analytics.length > 0
            ? analytics.reduce((acc, curr) => acc + curr.engagement, 0) /
                analytics.length
            : 0;
        const byPlatform = analytics.reduce((acc, curr) => {
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
        }, {});
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
    async getPostAnalytics(userId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, userId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
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
    async syncPostAnalytics(userId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, userId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.status !== 'PUBLISHED') {
            throw new common_1.BadRequestException('Can only sync analytics for published posts');
        }
        await this.analyticsSyncQueue.add({ postId: post.id }, {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
        });
        this.logger.log(`Analytics sync queued for post ${post.id}`);
        return {
            message: 'Analytics sync queued',
            postId: post.id,
        };
    }
    async getTopPerforming(userId, limit = 10, metric = 'engagementRate') {
        const validMetrics = [
            'views',
            'likes',
            'comments',
            'shares',
            'engagementRate',
        ];
        if (!validMetrics.includes(metric)) {
            throw new common_1.BadRequestException(`Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
        }
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
            const aValue = a.analytics[metric];
            const bValue = b.analytics[metric];
            return bValue - aValue;
        })
            .slice(0, limit);
        return {
            metric,
            posts: postsWithAnalytics,
        };
    }
    async getBestTimes(userId, platform) {
        const posts = await this.prisma.post.findMany({
            where: {
                userId,
                status: 'PUBLISHED',
                publishedAt: { not: null },
                ...(platform ? { platform: platform } : {}),
            },
            include: {
                analytics: {
                    orderBy: { metricsDate: 'desc' },
                    take: 1,
                },
            },
        });
        const hourStats = {};
        const dayStats = {};
        for (const post of posts) {
            if (!post.publishedAt || post.analytics.length === 0)
                continue;
            const date = new Date(post.publishedAt);
            const hour = date.getHours();
            const day = date.getDay();
            const views = post.analytics[0].views;
            const engagement = post.analytics[0].engagement;
            if (!hourStats[hour])
                hourStats[hour] = { total: 0, engagement: 0, count: 0 };
            hourStats[hour].total += views;
            hourStats[hour].engagement += engagement;
            hourStats[hour].count++;
            if (!dayStats[day])
                dayStats[day] = { total: 0, engagement: 0, count: 0 };
            dayStats[day].total += views;
            dayStats[day].engagement += engagement;
            dayStats[day].count++;
        }
        const bestHours = Object.entries(hourStats)
            .map(([hour, stats]) => ({
            hour: parseInt(hour),
            avgViews: Math.round(stats.total / stats.count),
            avgEngagement: Math.round((stats.engagement / stats.count) * 100) / 100,
            postsAnalyzed: stats.count,
        }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 5);
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
        const suggestion = bestHours.length > 0 && bestDays.length > 0
            ? `Best time: ${bestDays[0].day} at ${bestHours[0].hour}:00 (${bestHours[0].avgEngagement}% avg engagement)`
            : 'Not enough data yet. Post more to get personalized suggestions!';
        const defaultTimes = {
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
    async getInsights(userId) {
        const posts = await this.prisma.post.findMany({
            where: { userId, status: 'PUBLISHED' },
            include: {
                analytics: { orderBy: { metricsDate: 'desc' }, take: 1 },
            },
        });
        const platformStats = {};
        const postTypeStats = {};
        for (const post of posts) {
            if (post.analytics.length === 0)
                continue;
            const a = post.analytics[0];
            if (!platformStats[post.platform])
                platformStats[post.platform] = { views: 0, engagement: 0, count: 0 };
            platformStats[post.platform].views += a.views;
            platformStats[post.platform].engagement += a.engagement;
            platformStats[post.platform].count++;
            if (!postTypeStats[post.postType])
                postTypeStats[post.postType] = { views: 0, engagement: 0, count: 0 };
            postTypeStats[post.postType].views += a.views;
            postTypeStats[post.postType].engagement += a.engagement;
            postTypeStats[post.postType].count++;
        }
        const insights = [];
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bull_1.InjectQueue)('analytics-sync')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map