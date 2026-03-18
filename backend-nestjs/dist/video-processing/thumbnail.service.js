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
var ThumbnailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThumbnailService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const ffmpeg_service_1 = require("./ffmpeg.service");
let ThumbnailService = ThumbnailService_1 = class ThumbnailService {
    constructor(ffmpegService) {
        this.ffmpegService = ffmpegService;
        this.logger = new common_1.Logger(ThumbnailService_1.name);
    }
    async generateThumbnails(options) {
        const { inputPath, outputDir, timestamps, count = 3 } = options;
        this.logger.log('Generating thumbnails', {
            inputPath,
            outputDir,
            count: timestamps?.length || count,
        });
        await fs.mkdir(outputDir, { recursive: true });
        let targetTimestamps;
        if (timestamps && timestamps.length > 0) {
            targetTimestamps = timestamps;
        }
        else {
            const metadata = await this.ffmpegService.getVideoMetadata(inputPath);
            const duration = metadata.duration;
            if (duration <= 0) {
                throw new Error('Invalid video duration for thumbnail generation');
            }
            if (duration <= 10) {
                targetTimestamps = [1, duration / 2, Math.max(duration - 1, 1)];
            }
            else {
                const interval = duration / (count + 1);
                targetTimestamps = Array.from({ length: count }, (_, i) => (i + 1) * interval);
            }
        }
        const thumbnails = [];
        for (let i = 0; i < targetTimestamps.length; i++) {
            const timestamp = targetTimestamps[i];
            const filename = `thumbnail-${String(i + 1).padStart(5, '0')}.jpg`;
            const outputPath = path.join(outputDir, filename);
            try {
                await this.ffmpegService.extractThumbnail(inputPath, outputPath, timestamp);
                thumbnails.push({
                    path: outputPath,
                    timestamp,
                    filename,
                });
                this.logger.log('Thumbnail generated', {
                    filename,
                    timestamp,
                });
            }
            catch (error) {
                this.logger.error('Failed to generate thumbnail', {
                    timestamp,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        if (thumbnails.length === 0) {
            throw new Error('Failed to generate any thumbnails');
        }
        this.logger.log(`Generated ${thumbnails.length} thumbnails`, {
            outputDir,
        });
        return thumbnails;
    }
    async generateStandardThumbnails(inputPath, outputDir) {
        const metadata = await this.ffmpegService.getVideoMetadata(inputPath);
        const duration = metadata.duration;
        let timestamps;
        if (duration < 5) {
            timestamps = [
                Math.min(1, duration * 0.2),
                duration * 0.5,
                duration * 0.8,
            ];
        }
        else {
            timestamps = [1, 3, 5];
        }
        return this.generateThumbnails({
            inputPath,
            outputDir,
            timestamps,
        });
    }
};
exports.ThumbnailService = ThumbnailService;
exports.ThumbnailService = ThumbnailService = ThumbnailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ffmpeg_service_1.FfmpegService])
], ThumbnailService);
//# sourceMappingURL=thumbnail.service.js.map