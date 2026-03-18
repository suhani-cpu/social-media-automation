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
var VideoProcessingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoProcessingProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const transcoder_service_1 = require("../video-processing/transcoder.service");
let VideoProcessingProcessor = VideoProcessingProcessor_1 = class VideoProcessingProcessor {
    constructor(prisma, transcoder) {
        this.prisma = prisma;
        this.transcoder = transcoder;
        this.logger = new common_1.Logger(VideoProcessingProcessor_1.name);
    }
    async handle(job) {
        const { videoId, userId } = job.data;
        this.logger.log(`Starting video processing for ${videoId} (job ${job.id})`);
        try {
            await this.prisma.video.update({
                where: { id: videoId },
                data: { status: 'PROCESSING' },
            });
            await this.transcoder.processVideo({
                videoId,
                onProgress: async (stage, progress) => {
                    await job.progress(progress);
                    this.logger.debug(`Video ${videoId}: ${stage} - ${progress.toFixed(2)}%`);
                },
            });
            this.logger.log(`Video processing completed for ${videoId}`);
        }
        catch (error) {
            this.logger.error(`Video processing failed for ${videoId}:`, error);
            throw error;
        }
    }
};
exports.VideoProcessingProcessor = VideoProcessingProcessor;
__decorate([
    (0, bull_1.Process)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideoProcessingProcessor.prototype, "handle", null);
exports.VideoProcessingProcessor = VideoProcessingProcessor = VideoProcessingProcessor_1 = __decorate([
    (0, bull_1.Processor)('video-processing'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        transcoder_service_1.TranscoderService])
], VideoProcessingProcessor);
//# sourceMappingURL=video-processing.processor.js.map