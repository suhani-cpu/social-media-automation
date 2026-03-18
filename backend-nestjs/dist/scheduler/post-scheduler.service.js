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
var PostSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const prisma_service_1 = require("../prisma/prisma.service");
let PostSchedulerService = PostSchedulerService_1 = class PostSchedulerService {
    constructor(prisma, postPublishingQueue) {
        this.prisma = prisma;
        this.postPublishingQueue = postPublishingQueue;
        this.logger = new common_1.Logger(PostSchedulerService_1.name);
    }
    async checkAndPublishScheduledPosts() {
        const now = new Date();
        const scheduledPosts = await this.prisma.post.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledFor: { lte: now },
            },
            include: {
                video: { select: { id: true, title: true, status: true } },
                account: { select: { id: true, platform: true, username: true, status: true } },
            },
        });
        if (scheduledPosts.length === 0)
            return;
        this.logger.log(`Found ${scheduledPosts.length} posts to publish`);
        for (const post of scheduledPosts) {
            try {
                if (post.video?.status !== 'READY') {
                    await this.prisma.post.update({
                        where: { id: post.id },
                        data: { status: 'FAILED', errorMessage: `Video not ready: ${post.video?.status}` },
                    });
                    continue;
                }
                if (post.account.status !== 'ACTIVE') {
                    await this.prisma.post.update({
                        where: { id: post.id },
                        data: { status: 'FAILED', errorMessage: `Account not active: ${post.account.status}` },
                    });
                    continue;
                }
                await this.prisma.post.update({
                    where: { id: post.id },
                    data: { status: 'PUBLISHING' },
                });
                await this.postPublishingQueue.add({ postId: post.id, userId: post.userId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
                this.logger.log(`Queued post ${post.id} for publishing`);
            }
            catch (error) {
                this.logger.error(`Failed to queue post ${post.id}:`, error);
            }
        }
    }
    async getScheduledSummary() {
        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const [upcoming, today, thisWeek] = await Promise.all([
            this.prisma.post.count({ where: { status: 'SCHEDULED', scheduledFor: { gte: now } } }),
            this.prisma.post.count({ where: { status: 'SCHEDULED', scheduledFor: { gte: now, lte: todayEnd } } }),
            this.prisma.post.count({ where: { status: 'SCHEDULED', scheduledFor: { gte: now, lte: weekEnd } } }),
        ]);
        return { upcoming, today, thisWeek };
    }
    async reschedule(postId, newScheduledFor) {
        await this.prisma.post.update({
            where: { id: postId },
            data: { scheduledFor: newScheduledFor, status: 'SCHEDULED' },
        });
        this.logger.log(`Post ${postId} rescheduled to ${newScheduledFor}`);
    }
};
exports.PostSchedulerService = PostSchedulerService;
exports.PostSchedulerService = PostSchedulerService = PostSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bull_1.InjectQueue)('post-publishing')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], PostSchedulerService);
//# sourceMappingURL=post-scheduler.service.js.map