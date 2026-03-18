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
var TranscoderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscoderService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const ffmpeg_service_1 = require("./ffmpeg.service");
const thumbnail_service_1 = require("./thumbnail.service");
const formats_1 = require("./formats");
let TranscoderService = TranscoderService_1 = class TranscoderService {
    constructor(prisma, storage, ffmpegService, thumbnailService) {
        this.prisma = prisma;
        this.storage = storage;
        this.ffmpegService = ffmpegService;
        this.thumbnailService = thumbnailService;
        this.logger = new common_1.Logger(TranscoderService_1.name);
    }
    async processVideo(options) {
        const { videoId, onProgress } = options;
        this.logger.log('Starting video processing workflow', { videoId });
        const tempDir = path.join(os.tmpdir(), 'video-processing', videoId);
        await fs.mkdir(tempDir, { recursive: true });
        try {
            const video = await this.prisma.video.findUnique({
                where: { id: videoId },
            });
            if (!video) {
                throw new Error(`Video ${videoId} not found`);
            }
            this.logger.log('Video record fetched', {
                videoId,
                status: video.status,
                rawVideoUrl: video.rawVideoUrl,
            });
            let rawVideoPath;
            if (video.rawVideoUrl?.startsWith('file://')) {
                rawVideoPath = video.rawVideoUrl.replace('file://', '');
            }
            else if (video.rawVideoUrl?.startsWith('http')) {
                rawVideoPath = path.join(tempDir, 'raw-video.mp4');
                await this.storage.download(video.rawVideoUrl, rawVideoPath);
            }
            else {
                rawVideoPath = video.rawVideoUrl || '';
            }
            if (!rawVideoPath) {
                throw new Error('Raw video path is empty');
            }
            this.logger.log('Raw video located', { rawVideoPath });
            onProgress?.('validation', 10);
            await this.ffmpegService.validateVideo(rawVideoPath);
            this.logger.log('Video validation passed');
            onProgress?.('validation', 20);
            const metadata = await this.ffmpegService.getVideoMetadata(rawVideoPath);
            this.logger.log('Video metadata extracted', {
                duration: metadata.duration,
                resolution: `${metadata.width}x${metadata.height}`,
            });
            await this.prisma.video.update({
                where: { id: videoId },
                data: {
                    duration: Math.round(metadata.duration),
                    fileSize: BigInt(metadata.size),
                },
            });
            onProgress?.('metadata', 25);
            const formatNames = (0, formats_1.getAllFormatNames)();
            const processedVideos = {};
            for (let i = 0; i < formatNames.length; i++) {
                const formatName = formatNames[i];
                const format = formats_1.FORMATS[formatName];
                this.logger.log(`Transcoding to ${format.name}`, {
                    format: formatName,
                    progress: `${i + 1}/${formatNames.length}`,
                });
                const outputFilename = `${formatName.toLowerCase()}.mp4`;
                const outputPath = path.join(tempDir, outputFilename);
                await this.ffmpegService.transcodeVideo({
                    inputPath: rawVideoPath,
                    outputPath,
                    format,
                    onProgress: (percent) => {
                        const overallProgress = 25 + ((i + percent / 100) / formatNames.length) * 50;
                        onProgress?.('transcoding', overallProgress);
                    },
                });
                const s3Path = `videos/processed/${video.userId}/${videoId}/${outputFilename}`;
                const url = await this.storage.upload(outputPath, s3Path);
                processedVideos[formatName] = url;
                this.logger.log(`Uploaded ${format.name}`, {
                    format: formatName,
                    url,
                });
                await fs.unlink(outputPath);
            }
            onProgress?.('transcoding', 75);
            this.logger.log('Generating thumbnails');
            const thumbnailDir = path.join(tempDir, 'thumbnails');
            const thumbnails = await this.thumbnailService.generateStandardThumbnails(rawVideoPath, thumbnailDir);
            onProgress?.('thumbnails', 80);
            const thumbnailUrls = [];
            for (const thumbnail of thumbnails) {
                const s3Path = `videos/thumbnails/${video.userId}/${videoId}/${thumbnail.filename}`;
                const url = await this.storage.upload(thumbnail.path, s3Path);
                thumbnailUrls.push(url);
                this.logger.log('Thumbnail uploaded', {
                    filename: thumbnail.filename,
                    url,
                });
            }
            onProgress?.('thumbnails', 85);
            let rawVideoUrl = video.rawVideoUrl;
            if (rawVideoUrl?.startsWith('file://') ||
                !rawVideoUrl?.startsWith('http')) {
                const s3Path = `videos/raw/${video.userId}/${videoId}/original.mp4`;
                rawVideoUrl = await this.storage.upload(rawVideoPath, s3Path);
                this.logger.log('Raw video uploaded to persistent storage', {
                    rawVideoUrl,
                });
            }
            onProgress?.('upload', 90);
            const updateData = {
                status: 'READY',
                rawVideoUrl,
                thumbnailUrl: thumbnailUrls[0],
            };
            for (const [formatName, url] of Object.entries(processedVideos)) {
                const fieldName = formats_1.VIDEO_URL_FIELDS[formatName];
                if (fieldName) {
                    updateData[fieldName] = url;
                }
            }
            await this.prisma.video.update({
                where: { id: videoId },
                data: updateData,
            });
            this.logger.log('Database updated with URLs', {
                videoId,
                processedFormats: formatNames.length,
                thumbnails: thumbnailUrls.length,
            });
            onProgress?.('complete', 100);
            this.logger.log('Video processing workflow completed successfully', {
                videoId,
            });
        }
        catch (error) {
            this.logger.error('Video processing failed', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            await this.prisma.video.update({
                where: { id: videoId },
                data: {
                    status: 'FAILED',
                    metadata: {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        failedAt: new Date().toISOString(),
                    },
                },
            });
            throw error;
        }
        finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                this.logger.log('Temp directory cleaned up', { tempDir });
            }
            catch (error) {
                this.logger.warn('Failed to cleanup temp directory', {
                    tempDir,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    }
};
exports.TranscoderService = TranscoderService;
exports.TranscoderService = TranscoderService = TranscoderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        ffmpeg_service_1.FfmpegService,
        thumbnail_service_1.ThumbnailService])
], TranscoderService);
//# sourceMappingURL=transcoder.service.js.map