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
var PostPublishingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostPublishingProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const instagram_service_1 = require("../social-media/instagram/instagram.service");
const youtube_service_1 = require("../social-media/youtube/youtube.service");
const facebook_service_1 = require("../social-media/facebook/facebook.service");
let PostPublishingProcessor = PostPublishingProcessor_1 = class PostPublishingProcessor {
    constructor(prisma, instagramService, youtubeService, facebookService) {
        this.prisma = prisma;
        this.instagramService = instagramService;
        this.youtubeService = youtubeService;
        this.facebookService = facebookService;
        this.logger = new common_1.Logger(PostPublishingProcessor_1.name);
    }
    async handle(job) {
        const { postId } = job.data;
        this.logger.log(`Starting post publishing for ${postId}`);
        try {
            const post = await this.prisma.post.findUnique({
                where: { id: postId },
                include: { video: true, account: true },
            });
            if (!post || !post.video || !post.account) {
                throw new Error(`Post ${postId} or its relations not found`);
            }
            await this.prisma.post.update({
                where: { id: postId },
                data: { status: 'PUBLISHING' },
            });
            await job.progress(30);
            let platformPostId;
            let platformUrl;
            switch (post.platform) {
                case 'INSTAGRAM': {
                    const result = await this.instagramService.publishToInstagram(post, post.video, post.account);
                    platformPostId = result.id;
                    platformUrl = result.permalink;
                    break;
                }
                case 'YOUTUBE': {
                    const result = await this.youtubeService.publishToYouTube(post, post.video, post.account);
                    platformPostId = result.id;
                    platformUrl = result.url;
                    break;
                }
                case 'FACEBOOK': {
                    const result = await this.facebookService.publishToFacebook(post, post.video, post.account);
                    platformPostId = result.id;
                    platformUrl = result.permalink;
                    break;
                }
                default:
                    throw new Error(`Unsupported platform: ${post.platform}`);
            }
            await job.progress(90);
            await this.prisma.post.update({
                where: { id: postId },
                data: {
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                    platformPostId,
                    platformUrl,
                },
            });
            this.logger.log(`Post ${postId} published to ${post.platform}`);
            await job.progress(100);
        }
        catch (error) {
            this.logger.error(`Post publishing failed for ${postId}:`, error);
            await this.prisma.post.update({
                where: { id: postId },
                data: {
                    status: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    retryCount: { increment: 1 },
                },
            });
            throw error;
        }
    }
};
exports.PostPublishingProcessor = PostPublishingProcessor;
__decorate([
    (0, bull_1.Process)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostPublishingProcessor.prototype, "handle", null);
exports.PostPublishingProcessor = PostPublishingProcessor = PostPublishingProcessor_1 = __decorate([
    (0, bull_1.Processor)('post-publishing'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        instagram_service_1.InstagramService,
        youtube_service_1.YouTubeService,
        facebook_service_1.FacebookService])
], PostPublishingProcessor);
//# sourceMappingURL=post-publishing.processor.js.map