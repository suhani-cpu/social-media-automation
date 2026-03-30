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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const posts_service_1 = require("./posts.service");
const caption_service_1 = require("../caption/caption.service");
let PostsController = class PostsController {
    constructor(postsService, captionService) {
        this.postsService = postsService;
        this.captionService = captionService;
    }
    async generateCaption(body) {
        const variations = await this.captionService.generate({
            videoTitle: body.videoTitle,
            videoDescription: body.videoDescription,
            platform: body.platform,
            language: body.language,
            tone: body.tone || ['engaging'],
            context: body.context,
        });
        return { variations };
    }
    create(user, body) {
        return this.postsService.create(user.id, body);
    }
    findAll(user) {
        return this.postsService.findAll(user.id);
    }
    batchPublish(user, body) {
        return this.postsService.batchPublish(user.id, body.postIds);
    }
    publish(user, id) {
        return this.postsService.publish(user.id, id);
    }
    resetPost(user, id) {
        return this.postsService.resetPost(user.id, id);
    }
    retryPublish(user, id) {
        return this.postsService.retryPublish(user.id, id);
    }
    getPublishProgress(id) {
        return this.postsService.getPublishProgress(id);
    }
    getScheduledSummary() {
        return this.postsService.getScheduledSummary();
    }
    reschedule(user, id, body) {
        return this.postsService.reschedule(user.id, id, body.scheduledFor);
    }
    deletePost(user, id) {
        return this.postsService.delete(user.id, id);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)('generate-caption'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "generateCaption", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('batch-publish'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "batchPublish", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/reset'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "resetPost", null);
__decorate([
    (0, common_1.Post)(':id/retry'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "retryPublish", null);
__decorate([
    (0, common_1.Get)(':id/publish-progress'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getPublishProgress", null);
__decorate([
    (0, common_1.Get)('scheduled/summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getScheduledSummary", null);
__decorate([
    (0, common_1.Put)(':id/reschedule'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "reschedule", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "deletePost", null);
exports.PostsController = PostsController = __decorate([
    (0, common_1.Controller)('posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [posts_service_1.PostsService,
        caption_service_1.CaptionService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map