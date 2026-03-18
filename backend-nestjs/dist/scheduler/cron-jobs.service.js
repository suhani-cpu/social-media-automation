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
var CronJobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronJobsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
const post_scheduler_service_1 = require("./post-scheduler.service");
let CronJobsService = CronJobsService_1 = class CronJobsService {
    constructor(prisma, postScheduler, analyticsSyncQueue) {
        this.prisma = prisma;
        this.postScheduler = postScheduler;
        this.analyticsSyncQueue = analyticsSyncQueue;
        this.logger = new common_1.Logger(CronJobsService_1.name);
        this.logger.log('Cron jobs initialized');
    }
    async checkScheduledPosts() {
        try {
            await this.postScheduler.checkAndPublishScheduledPosts();
        }
        catch (error) {
            this.logger.error('Scheduled posts check failed:', error);
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
            this.logger.log(`Found ${expiringAccounts.length} tokens expiring soon`);
            for (const account of expiringAccounts) {
                try {
                    this.logger.log(`Token refresh needed for ${account.platform} account ${account.id}`);
                }
                catch (error) {
                    this.logger.error(`Failed to refresh token for account ${account.id}:`, error);
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
    __param(2, (0, bull_1.InjectQueue)('analytics-sync')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        post_scheduler_service_1.PostSchedulerService, Object])
], CronJobsService);
//# sourceMappingURL=cron-jobs.service.js.map