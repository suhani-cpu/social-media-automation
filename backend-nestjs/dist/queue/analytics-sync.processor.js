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
var AnalyticsSyncProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsSyncProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("../analytics/analytics.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsSyncProcessor = AnalyticsSyncProcessor_1 = class AnalyticsSyncProcessor {
    constructor(analyticsService, prisma) {
        this.analyticsService = analyticsService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(AnalyticsSyncProcessor_1.name);
    }
    async handle(job) {
        const { postId } = job.data;
        this.logger.log(`Starting analytics sync for post ${postId}`);
        try {
            const post = await this.prisma.post.findUnique({ where: { id: postId } });
            if (!post) {
                throw new Error(`Post ${postId} not found`);
            }
            await this.analyticsService.syncPostAnalytics(post.userId, postId);
            this.logger.log(`Analytics sync completed for post ${postId}`);
        }
        catch (error) {
            this.logger.error(`Analytics sync failed for post ${postId}:`, error);
            throw error;
        }
    }
};
exports.AnalyticsSyncProcessor = AnalyticsSyncProcessor;
__decorate([
    (0, bull_1.Process)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsSyncProcessor.prototype, "handle", null);
exports.AnalyticsSyncProcessor = AnalyticsSyncProcessor = AnalyticsSyncProcessor_1 = __decorate([
    (0, bull_1.Processor)('analytics-sync'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        prisma_service_1.PrismaService])
], AnalyticsSyncProcessor);
//# sourceMappingURL=analytics-sync.processor.js.map