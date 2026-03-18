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
var VideosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = __importStar(require("fs/promises"));
let VideosService = VideosService_1 = class VideosService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(VideosService_1.name);
    }
    async upload(userId, file, body) {
        const video = await this.prisma.video.create({
            data: {
                userId,
                title: body.title || file.originalname || 'Untitled Video',
                description: body.description,
                language: body.language || 'HINGLISH',
                sourceType: 'MANUAL',
                status: 'READY',
                rawVideoUrl: file.path,
                fileSize: BigInt(file.size),
            },
        });
        this.logger.log(`Video ${video.id} uploaded directly (${file.size} bytes)`);
        return { message: 'Video uploaded successfully', video };
    }
    async findAll(userId) {
        const videos = await this.prisma.video.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, title: true, description: true, status: true,
                thumbnailUrl: true, duration: true, fileSize: true,
                rawVideoUrl: true, createdAt: true,
            },
        });
        return { videos };
    }
    async findOne(userId, id) {
        const video = await this.prisma.video.findFirst({ where: { id, userId } });
        if (!video)
            throw new common_1.NotFoundException('Video not found');
        return { video };
    }
    async remove(userId, id) {
        const video = await this.prisma.video.findFirst({ where: { id, userId } });
        if (!video)
            throw new common_1.NotFoundException('Video not found');
        const filesToDelete = [
            video.rawVideoUrl, video.instagramReelUrl, video.youtubeShortsUrl,
            video.youtubeVideoUrl, video.facebookSquareUrl, video.facebookLandscapeUrl,
            video.thumbnailUrl,
        ].filter((url) => url !== null);
        for (const filePath of filesToDelete) {
            try {
                await fs.unlink(filePath);
            }
            catch { }
        }
        await this.prisma.video.delete({ where: { id } });
        this.logger.log(`Video ${id} deleted by user ${userId}`);
        return { message: 'Video deleted successfully', videoId: id };
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = VideosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VideosService);
//# sourceMappingURL=videos.service.js.map