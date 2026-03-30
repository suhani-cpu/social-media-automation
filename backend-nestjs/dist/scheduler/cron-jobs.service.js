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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CronJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronJobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
const post_scheduler_service_1 = require("./post-scheduler.service");
const youtube_oauth_service_1 = require("../oauth/services/youtube-oauth.service");
let CronJobsService = CronJobsService_1 = class CronJobsService {
    constructor(prisma, postScheduler, youtubeOAuth, analyticsSyncQueue) {
        this.prisma = prisma;
        this.postScheduler = postScheduler;
        this.youtubeOAuth = youtubeOAuth;
        this.analyticsSyncQueue = analyticsSyncQueue;
        this.logger = new common_1.Logger(CronJobsService_1.name);
        this.logger.log('Cron jobs initialized');
    }
    async checkScheduledPosts() {
        try {
            await this.resetStuckPublishingPosts();
            await this.postScheduler.checkAndPublishScheduledPosts();
        }
        catch (error) {
            this.logger.error('Scheduled posts check failed:', error);
        }
    }
    async resetStuckPublishingPosts() {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        try {
            const stuckPosts = await this.prisma.post.updateMany({
                where: {
                    status: 'PUBLISHING',
                    updatedAt: { lt: tenMinutesAgo },
                },
                data: {
                    status: 'FAILED',
                    errorMessage: 'Publishing timed out — auto-reset after 10 minutes. Try again with a smaller video.',
                },
            });
            if (stuckPosts.count > 0) {
                this.logger.warn(`Reset ${stuckPosts.count} stuck PUBLISHING posts to FAILED`);
            }
        }
        catch (error) {
            this.logger.error('Failed to reset stuck posts:', error);
        }
    }
    async refreshExpiringTokens() {
        const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
        try {
            const expiringAccounts = await this.prisma.socialAccount.findMany({
                where: {
                    tokenExpiry: { lte: expiryThreshold },
                    status: 'ACTIVE',
                    refreshToken: { not: null },
                },
            });
            if (expiringAccounts.length === 0)
                return;
            this.logger.log(`Found ${expiringAccounts.length} tokens expiring soon — refreshing`);
            for (const account of expiringAccounts) {
                try {
                    if (account.platform === 'YOUTUBE') {
                        await this.youtubeOAuth.refreshToken(account.id);
                        this.logger.log(`✅ YouTube token refreshed for ${account.username}`);
                    }
                    else if (account.platform === 'GOOGLE_DRIVE') {
                        const { google } = await Promise.resolve().then(() => __importStar(require('googleapis')));
                        const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET);
                        oauth2Client.setCredentials({ refresh_token: account.refreshToken });
                        const { credentials } = await oauth2Client.refreshAccessToken();
                        await this.prisma.socialAccount.update({
                            where: { id: account.id },
                            data: {
                                accessToken: credentials.access_token,
                                tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                            },
                        });
                        this.logger.log(`✅ Drive token refreshed for ${account.username}`);
                    }
                    else if (account.platform === 'FACEBOOK' || account.platform === 'INSTAGRAM') {
                        this.logger.log(`⚠️ ${account.platform} token expiring — user needs to reconnect`);
                    }
                }
                catch (error) {
                    this.logger.error(`❌ Failed to refresh ${account.platform} token for ${account.username}: ${error.message}`);
                    await this.prisma.socialAccount.update({
                        where: { id: account.id },
                        data: { status: 'EXPIRED' },
                    });
                }
            }
        }
        catch (error) {
            this.logger.error('Token refresh check failed:', error);
        }
    }
    async syncAllPublishedPosts() {
        try {
            const recentPosts = await this.prisma.post.findMany({
                where: {
                    status: 'PUBLISHED',
                    platformPostId: { not: null },
                    publishedAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
                select: { id: true },
            });
            if (recentPosts.length === 0)
                return;
            this.logger.log(`Queuing analytics sync for ${recentPosts.length} posts`);
            for (const post of recentPosts) {
                const delay = Math.floor(Math.random() * 5000);
                await this.analyticsSyncQueue.add({ postId: post.id }, { attempts: 2, backoff: { type: 'exponential', delay: 10000 }, delay });
            }
        }
        catch (error) {
            this.logger.error('Analytics sync failed:', error);
        }
    }
    async cleanupOldData() {
        try {
            this.logger.log('Starting cleanup...');
            const analyticsDeleted = await this.prisma.analytics.deleteMany({
                where: { metricsDate: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            });
            this.logger.log(`Deleted ${analyticsDeleted.count} old analytics records`);
            const failedPostsDeleted = await this.prisma.post.deleteMany({
                where: {
                    status: 'FAILED',
                    createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            });
            this.logger.log(`Deleted ${failedPostsDeleted.count} old failed posts`);
            const jobsDeleted = await this.prisma.job.deleteMany({
                where: {
                    createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
                },
            });
            this.logger.log(`Deleted ${jobsDeleted.count} old job records`);
            this.logger.log('Cleanup completed');
        }
        catch (error) {
            this.logger.error('Cleanup failed:', error);
        }
    }
};
exports.CronJobsService = CronJobsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobsService.prototype, "checkScheduledPosts", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobsService.prototype, "refreshExpiringTokens", null);
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobsService.prototype, "syncAllPublishedPosts", null);
__decorate([
    (0, schedule_1.Cron)('0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronJobsService.prototype, "cleanupOldData", null);
exports.CronJobsService = CronJobsService = CronJobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bull_1.InjectQueue)('analytics-sync')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        post_scheduler_service_1.PostSchedulerService,
        youtube_oauth_service_1.YouTubeOAuthService, Object])
], CronJobsService);
//# sourceMappingURL=cron-jobs.service.js.map