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
exports.ClipsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const clips_service_1 = require("./clips.service");
const fs_1 = require("fs");
let ClipsController = class ClipsController {
    constructor(clipsService) {
        this.clipsService = clipsService;
    }
    async clipVideo(user, body, res) {
        const result = await this.clipsService.clipVideo(user.id, body);
        const outputPath = result.clip.outputPath;
        try {
            const stat = (0, fs_1.statSync)(outputPath);
            res.set({
                'Content-Type': 'video/mp4',
                'Content-Length': stat.size,
                'Content-Disposition': `attachment; filename="clip-${result.clip.videoId}.mp4"`,
                'Cache-Control': 'no-cache',
            });
            const stream = (0, fs_1.createReadStream)(outputPath);
            stream.on('end', () => {
                try {
                    (0, fs_1.unlinkSync)(outputPath);
                }
                catch { }
            });
            stream.pipe(res);
        }
        catch (error) {
            try {
                (0, fs_1.unlinkSync)(outputPath);
            }
            catch { }
            throw error;
        }
    }
};
exports.ClipsController = ClipsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ClipsController.prototype, "clipVideo", null);
exports.ClipsController = ClipsController = __decorate([
    (0, common_1.Controller)('clip'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [clips_service_1.ClipsService])
], ClipsController);
//# sourceMappingURL=clips.controller.js.map