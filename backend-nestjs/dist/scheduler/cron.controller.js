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
var CronController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const posts_service_1 = require("../posts/posts.service");
let CronController = CronController_1 = class CronController {
    constructor(configService, prisma, postsService) {
        this.configService = configService;
        this.prisma = prisma;
        this.postsService = postsService;
        this.logger = new common_1.Logger(CronController_1.name);
    }
    async processScheduledPosts(authHeader) {
        this.verifyCronSecret(authHeader);
        const now = new Date();
        this.logger.log(`Cron: checking for scheduled posts (now=${now.toISOString()})`);
        const scheduledPosts = await this.prisma.post.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledFor: { lte: now },
            },
            include: {
                video: { select: { id: true, title: true, status: true } },
                account: { select: { id: true, platform: true, username: true, status: true } },
            },
            orderBy: { scheduledFor: 'asc' },
            take: 10,
        });
        if (scheduledPosts.length === 0) {
            this.logger.log('Cron: no scheduled posts to process');
            return { message: 'No scheduled posts to process', processed: 0 };
        }
        this.logger.log(`Cron: found ${scheduledPosts.length} posts to publish`);
        const results = [];
        for (const post of scheduledPosts) {
            try {
                if (post.video?.status !== 'READY') {
                    await this.prisma.post.update({
                        where: { id: post.id },
                        data: {
                            status: 'FAILED',
                            errorMessage: `Video not ready: ${post.video?.status}`,
                        },
                    });
                    results.push({
                        postId: post.id,
                        status: 'FAILED',
                        message: `Video not ready: ${post.video?.status}`,
                    });
                    continue;
                }
                if (post.account.status !== 'ACTIVE') {
                    await this.prisma.post.update({
                        where: { id: post.id },
                        data: {
                            status: 'FAILED',
                            errorMessage: `Account not active: ${post.account.status}`,
                        },
                    });
                    results.push({
                        postId: post.id,
                        status: 'FAILED',
                        message: `Account not active: ${post.account.status}`,
                    });
                    continue;
                }
                const result = await this.postsService.publish(post.userId, post.id);
                results.push({
                    postId: post.id,
                    status: 'PUBLISHED',
                    message: result.message,
                });
                this.logger.log(`Cron: published post ${post.id}`);
            }
            catch (error) {
                this.logger.error(`Cron: failed to publish post ${post.id}:`, error);
                results.push({
                    postId: post.id,
                    status: 'FAILED',
                    message: error.message || 'Unknown error',
                });
            }
        }
        const published = results.filter((r) => r.status === 'PUBLISHED').length;
        const failed = results.filter((r) => r.status === 'FAILED').length;
        this.logger.log(`Cron: finished — ${published} published, ${failed} failed out of ${scheduledPosts.length}`);
        return {
            message: `Processed ${scheduledPosts.length} scheduled posts`,
            processed: scheduledPosts.length,
            published,
            failed,
            results,
        };
    }
    verifyCronSecret(authHeader) {
        const cronSecret = this.configService.get('CRON_SECRET');
        if (!cronSecret) {
            this.logger.warn('CRON_SECRET not configured — rejecting cron request');
            throw new common_1.UnauthorizedException('Cron endpoint not configured');
        }
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        if (token !== cronSecret) {
            this.logger.warn('Invalid cron secret received');
            throw new common_1.UnauthorizedException('Invalid cron secret');
        }
    }
};
exports.CronController = CronController;
__decorate([
    (0, common_1.Get)('process-scheduled'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CronController.prototype, "processScheduledPosts", null);
exports.CronController = CronController = CronController_1 = __decorate([
    (0, common_1.Controller)('cron'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        posts_service_1.PostsService])
], CronController);
//# sourceMappingURL=cron.controller.js.map