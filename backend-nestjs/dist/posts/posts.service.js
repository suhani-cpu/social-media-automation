"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PostsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const youtube_service_1 = require("../social-media/youtube/youtube.service");
const instagram_service_1 = require("../social-media/instagram/instagram.service");
const facebook_service_1 = require("../social-media/facebook/facebook.service");
const drive_service_1 = require("../drive/drive.service");
const ioredis_1 = __importDefault(require("ioredis"));
const PROGRESS_TTL = 120;
let PostsService = PostsService_1 = class PostsService {
    constructor(prisma, configService, youtubeService, instagramService, facebookService, driveService) {
        this.prisma = prisma;
        this.configService = configService;
        this.youtubeService = youtubeService;
        this.instagramService = instagramService;
        this.facebookService = facebookService;
        this.driveService = driveService;
        this.logger = new common_1.Logger(PostsService_1.name);
        this.redis = null;
        this.fallbackProgress = new Map();
    }
    onModuleInit() {
        try {
            const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
            this.redis = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
            this.redis.connect().catch(() => {
                this.logger.warn('Redis not available for publish progress — using in-memory fallback');
                this.redis = null;
            });
        }
        catch {
            this.logger.warn('Redis init failed — using in-memory fallback');
            this.redis = null;
        }
    }
    async setProgress(postId, progress) {
        if (this.redis) {
            try {
                await this.redis.setex(`publish-progress:${postId}`, PROGRESS_TTL, JSON.stringify(progress));
                return;
            }
            catch { }
        }
        this.fallbackProgress.set(postId, progress);
    }
    async getProgress(postId) {
        if (this.redis) {
            try {
                const data = await this.redis.get(`publish-progress:${postId}`);
                if (data)
                    return JSON.parse(data);
                return null;
            }
            catch { }
        }
        return this.fallbackProgress.get(postId) || null;
    }
    async deleteProgress(postId) {
        if (this.redis) {
            try {
                await this.redis.del(`publish-progress:${postId}`);
                return;
            }
            catch { }
        }
        this.fallbackProgress.delete(postId);
    }
    async create(userId, dto) {
        const video = await this.prisma.video.findFirst({
            where: { id: dto.videoId, userId },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        const account = await this.prisma.socialAccount.findFirst({
            where: { id: dto.accountId, userId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Social account not found');
        }
        const post = await this.prisma.post.create({
            data: {
                userId,
                videoId: dto.videoId,
                accountId: dto.accountId,
                caption: dto.caption,
                language: dto.language,
                hashtags: dto.hashtags || [],
                platform: dto.platform,
                postType: dto.postType,
                status: dto.scheduledFor ? 'SCHEDULED' : 'DRAFT',
                scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
                metadata: dto.metadata || undefined,
            },
        });
        this.logger.log(`Post ${post.id} created by user ${userId}`);
        return { message: 'Post created successfully', post };
    }
    async findAll(userId) {
        const posts = await this.prisma.post.findMany({
            where: { userId },
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
        return { posts };
    }
    async publish(userId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, userId },
            include: {
                video: true,
                account: true,
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.status === 'PUBLISHING') {
            return { message: 'Post is already being published', postId: post.id };
        }
        if (post.status === 'PUBLISHED') {
            return { message: 'Post is already published', postId: post.id };
        }
        await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'PUBLISHING' },
        });
        await this.executePublish(post.id, post, post.video, post.account);
        const updated = await this.prisma.post.findFirst({ where: { id: post.id } });
        if (updated?.status === 'PUBLISHED') {
            return { message: 'Published successfully', postId: post.id, platformUrl: updated.platformUrl };
        }
        else {
            return { message: updated?.errorMessage || 'Publishing failed', postId: post.id, status: updated?.status };
        }
    }
    async getPublishProgress(postId) {
        const progress = await this.getProgress(postId);
        return progress || {
            stage: 'done',
            percent: 100,
            message: 'No active publish',
        };
    }
    async executePublish(postId, post, video, account) {
        let driveDownloadPath = null;
        try {
            let result;
            if (!video) {
                throw new common_1.BadRequestException('Post has no associated video');
            }
            if (!account) {
                throw new common_1.BadRequestException('Post has no associated social account');
            }
            const metadata = video.metadata;
            if (metadata?.driveFileId) {
                this.setProgress(postId, {
                    stage: 'downloading',
                    percent: 0,
                    message: 'Downloading from Google Drive...',
                });
                driveDownloadPath = await this.driveService.downloadToTemp(post.userId, metadata.driveFileId, metadata.driveFileName);
                video.rawVideoUrl = driveDownloadPath;
                this.setProgress(postId, {
                    stage: 'downloading',
                    percent: 100,
                    message: 'Download complete',
                });
            }
            if (post.platform === 'INSTAGRAM') {
                this.setProgress(postId, {
                    stage: 'uploading',
                    percent: 0,
                    message: 'Publishing to Instagram...',
                });
                const igResult = await this.instagramService.publishToInstagram(post, video, account);
                result = { id: igResult.id, permalink: igResult.permalink };
            }
            else if (post.platform === 'YOUTUBE') {
                result = await this.youtubeService.publishToYouTube(post, video, account, (progress) => {
                    this.setProgress(postId, progress);
                });
            }
            else if (post.platform === 'FACEBOOK') {
                this.setProgress(postId, {
                    stage: 'uploading',
                    percent: 0,
                    message: 'Publishing to Facebook...',
                });
                const fbResult = await this.facebookService.publishToFacebook(post, video, account);
                result = { id: fbResult.id, permalink: fbResult.permalink };
            }
            else {
                throw new common_1.BadRequestException(`Unsupported platform: ${post.platform}`);
            }
            await this.prisma.post.update({
                where: { id: postId },
                data: {
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                    platformPostId: result.id,
                    platformUrl: result.permalink || result.url,
                },
            });
            this.setProgress(postId, {
                stage: 'done',
                percent: 100,
                message: 'Published successfully!',
            });
            this.logger.log(`Post ${postId} published to ${post.platform}`);
            setTimeout(() => this.deleteProgress(postId), 60000);
        }
        catch (publishError) {
            await this.prisma.post.update({
                where: { id: postId },
                data: {
                    status: 'FAILED',
                    errorMessage: publishError.message,
                },
            });
            this.setProgress(postId, {
                stage: 'error',
                percent: 0,
                message: publishError.message || 'Publishing failed',
            });
            setTimeout(() => this.deleteProgress(postId), 60000);
        }
        finally {
            if (driveDownloadPath) {
                try {
                    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                    await fs.unlink(driveDownloadPath);
                    this.logger.log(`Cleaned up Drive temp file: ${driveDownloadPath}`);
                }
                catch { }
            }
        }
    }
    async batchPublish(userId, postIds) {
        if (!postIds || postIds.length === 0) {
            throw new common_1.BadRequestException('postIds is required');
        }
        const posts = await this.prisma.post.findMany({
            where: {
                id: { in: postIds },
                userId,
                status: { in: ['DRAFT', 'SCHEDULED', 'FAILED'] },
            },
            include: { video: true, account: true },
        });
        if (posts.length === 0) {
            throw new common_1.BadRequestException('No publishable posts found');
        }
        const results = [];
        for (const post of posts) {
            await this.prisma.post.update({
                where: { id: post.id },
                data: { status: 'PUBLISHING' },
            });
            this.setProgress(post.id, {
                stage: 'downloading',
                percent: 0,
                message: 'Queued for publish...',
            });
            results.push({ postId: post.id, status: 'publishing', message: 'Publishing started' });
        }
        const byPlatform = new Map();
        for (const post of posts) {
            const group = byPlatform.get(post.platform) || [];
            group.push(post);
            byPlatform.set(post.platform, group);
        }
        for (const [platform, platformPosts] of byPlatform) {
            const concurrencyLimit = 2;
            for (let i = 0; i < platformPosts.length; i += concurrencyLimit) {
                const batch = platformPosts.slice(i, i + concurrencyLimit);
                const batchPromises = batch.map((post) => this.executePublish(post.id, post, post.video, post.account).catch((err) => {
                    this.logger.error(`Background publish failed for post ${post.id}:`, err);
                }));
                Promise.allSettled(batchPromises).then(() => {
                    this.logger.log(`Batch for ${platform} (${i}-${i + batch.length}) completed`);
                });
                if (i + concurrencyLimit < platformPosts.length) {
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }
        }
        this.logger.log(`Batch publish started (rate-limited): ${posts.length} posts for user ${userId}`);
        return {
            message: `Publishing ${posts.length} posts`,
            total: posts.length,
            results,
        };
    }
    async retryPublish(userId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, userId, status: 'FAILED' },
            include: { video: true, account: true },
        });
        if (!post) {
            throw new common_1.NotFoundException('Failed post not found');
        }
        await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'PUBLISHING', errorMessage: null },
        });
        await this.executePublish(post.id, post, post.video, post.account);
        const updated = await this.prisma.post.findFirst({ where: { id: post.id } });
        if (updated?.status === 'PUBLISHED') {
            return { message: 'Published successfully', postId: post.id, platformUrl: updated.platformUrl };
        }
        else {
            return { message: updated?.errorMessage || 'Retry failed', postId: post.id, status: updated?.status };
        }
    }
    async delete(userId, postId) {
        const post = await this.prisma.post.findFirst({
            where: { id: postId, userId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        await this.prisma.post.delete({ where: { id: post.id } });
        this.logger.log(`Post ${postId} deleted by user ${userId}`);
        return { message: 'Post deleted successfully' };
    }
    async getScheduledSummary() {
        const now = new Date();
        const scheduledPosts = await this.prisma.post.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledFor: { gte: now },
            },
            include: {
                video: {
                    select: { id: true, title: true, thumbnailUrl: true },
                },
                account: {
                    select: { id: true, platform: true, username: true },
                },
            },
            orderBy: { scheduledFor: 'asc' },
        });
        const byPlatform = scheduledPosts.reduce((acc, post) => {
            const platform = post.platform;
            if (!acc[platform])
                acc[platform] = [];
            acc[platform].push(post);
            return acc;
        }, {});
        return {
            message: 'Scheduled posts summary',
            summary: {
                total: scheduledPosts.length,
                byPlatform,
                posts: scheduledPosts,
            },
        };
    }
    async reschedule(userId, postId, scheduledFor) {
        if (!scheduledFor) {
            throw new common_1.BadRequestException('scheduledFor is required');
        }
        const post = await this.prisma.post.findFirst({
            where: { id: postId, userId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        const newScheduledDate = new Date(scheduledFor);
        await this.prisma.post.update({
            where: { id: post.id },
            data: {
                scheduledFor: newScheduledDate,
                status: 'SCHEDULED',
            },
        });
        this.logger.log(`Post ${postId} rescheduled to ${newScheduledDate.toISOString()} by user ${userId}`);
        return {
            message: 'Post rescheduled successfully',
            scheduledFor: newScheduledDate,
        };
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = PostsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        youtube_service_1.YouTubeService,
        instagram_service_1.InstagramService,
        facebook_service_1.FacebookService,
        drive_service_1.DriveService])
], PostsService);
//# sourceMappingURL=posts.service.js.map