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
var ClipsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const drive_service_1 = require("../drive/drive.service");
const ffmpeg = __importStar(require("fluent-ffmpeg"));
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) {
        ffmpeg.setFfmpegPath(ffmpegStatic);
    }
}
catch {
}
const TEMP_DIR = '/tmp/clips';
const MAX_DURATION = 600;
const MAX_CONCURRENT = 5;
const PROCESS_TIMEOUT = 5 * 60 * 1000;
const FRAMING_TIMEOUT = 10 * 60 * 1000;
const LOGO_PATH = path.join(process.cwd(), 'uploads', 'logo.png');
let ClipsService = ClipsService_1 = class ClipsService {
    constructor(prisma, driveService) {
        this.prisma = prisma;
        this.driveService = driveService;
        this.logger = new common_1.Logger(ClipsService_1.name);
        this.activeProcesses = 0;
        this.queue = [];
    }
    async clipVideo(userId, body) {
        const { videoId, startTime, endTime, format, overlay } = body;
        const duration = endTime - startTime;
        if (duration <= 0) {
            throw new common_1.BadRequestException('End time must be after start time');
        }
        if (duration > MAX_DURATION) {
            throw new common_1.BadRequestException(`Max clip duration is ${MAX_DURATION / 60} minutes`);
        }
        const video = await this.prisma.video.findFirst({
            where: { id: videoId, userId },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        let inputUrl = video.rawVideoUrl || video.sourceUrl;
        let downloadedFromDrive = false;
        const metadata = video.metadata;
        if (!inputUrl || !fs.existsSync(inputUrl)) {
            const driveFileId = metadata?.driveFileId;
            if (driveFileId) {
                this.logger.log(`Downloading video from Drive for clipping: ${driveFileId}`);
                inputUrl = await this.driveService.downloadToTemp(userId, driveFileId, metadata?.driveFileName);
                downloadedFromDrive = true;
            }
            else {
                throw new common_1.BadRequestException('Video file not available for clipping. The file may have been removed from temporary storage.');
            }
        }
        const clippedPath = await this.cutClip(inputUrl, startTime, duration);
        if (downloadedFromDrive) {
            this.deleteTempFile(inputUrl);
        }
        let outputPath = clippedPath;
        if (format && format !== 'original') {
            outputPath = await this.applyFraming(clippedPath, {
                aspectRatio: format,
                paddingColor: overlay?.paddingColor,
                topCaption: overlay?.topCaption,
                bottomCaption: overlay?.bottomCaption,
                captionFontSize: overlay?.captionFontSize,
                captionColor: overlay?.captionColor,
                captionFont: overlay?.captionFont,
                logoX: overlay?.logoX,
                logoY: overlay?.logoY,
                logoScale: overlay?.logoScale,
            });
            if (outputPath !== clippedPath) {
                this.deleteTempFile(clippedPath);
            }
        }
        const stats = fs.statSync(outputPath);
        this.logger.log(`Clip created for video ${videoId}: ${outputPath} (${stats.size} bytes)`);
        return {
            message: 'Video clipped successfully',
            clip: {
                videoId,
                outputPath,
                fileSize: stats.size,
                duration,
                format: format || 'original',
            },
        };
    }
    ensureTempDir() {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
    }
    processQueue() {
        if (this.queue.length === 0 || this.activeProcesses >= MAX_CONCURRENT) {
            return;
        }
        const next = this.queue.shift();
        if (next)
            next();
    }
    cutClip(inputUrl, startSeconds, duration) {
        this.ensureTempDir();
        return new Promise((resolve, reject) => {
            const executeClip = () => {
                this.activeProcesses++;
                const outputFileName = `${(0, uuid_1.v4)()}.mp4`;
                const outputPath = path.join(TEMP_DIR, outputFileName);
                let timeoutId;
                let command;
                const cleanup = () => {
                    this.activeProcesses--;
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    this.processQueue();
                };
                timeoutId = setTimeout(() => {
                    if (command)
                        command.kill('SIGKILL');
                    cleanup();
                    reject(new Error('Processing timeout - exceeded 5 minutes'));
                }, PROCESS_TIMEOUT);
                command = ffmpeg(inputUrl)
                    .setStartTime(startSeconds)
                    .setDuration(duration)
                    .outputOptions(['-c', 'copy'])
                    .output(outputPath)
                    .on('end', () => {
                    cleanup();
                    resolve(outputPath);
                })
                    .on('error', (err) => {
                    cleanup();
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }
                    reject(new Error(`FFmpeg error: ${err.message}`));
                });
                command.run();
            };
            if (this.activeProcesses >= MAX_CONCURRENT) {
                this.queue.push(executeClip);
            }
            else {
                executeClip();
            }
        });
    }
    getVideoDimensions(inputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                if (!videoStream) {
                    reject(new Error('No video stream found'));
                    return;
                }
                resolve({
                    width: videoStream.width,
                    height: videoStream.height,
                    duration: metadata.format.duration || 0,
                });
            });
        });
    }
    calculatePaddedDimensions(inputWidth, inputHeight, targetAspect) {
        const scaledWidth = inputWidth;
        const scaledHeight = inputHeight;
        let outputWidth;
        let outputHeight;
        if (targetAspect === '1:1') {
            const size = Math.max(inputWidth, inputHeight);
            outputWidth = size;
            outputHeight = size;
        }
        else if (targetAspect === '16:9') {
            const targetRatio = 16 / 9;
            if (inputWidth / inputHeight > targetRatio) {
                outputWidth = inputWidth;
                outputHeight = Math.round(inputWidth / targetRatio);
            }
            else {
                outputHeight = inputHeight;
                outputWidth = Math.round(inputHeight * targetRatio);
            }
        }
        else if (targetAspect === '9:16') {
            const targetRatio = 9 / 16;
            if (inputWidth / inputHeight > targetRatio) {
                outputWidth = inputWidth;
                outputHeight = Math.round(inputWidth / targetRatio);
            }
            else {
                outputHeight = inputHeight;
                outputWidth = Math.round(inputHeight * targetRatio);
            }
        }
        else {
            outputWidth = inputWidth;
            outputHeight = inputHeight;
        }
        const padX = Math.round((outputWidth - scaledWidth) / 2);
        const padY = Math.round((outputHeight - scaledHeight) / 2);
        return { outputWidth, outputHeight, scaledWidth, scaledHeight, padX, padY };
    }
    getLogoPath() {
        return fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
    }
    buildFilterComplex(options) {
        const { aspectRatio, paddingColor = '#000000', topCaption, bottomCaption, captionFontSize = 24, captionColor = 'white', captionFont = 'sans-serif', logoX = 85, logoY = 15, logoScale = 0.15, inputWidth = 1920, inputHeight = 1080, } = options;
        const filters = [];
        let currentOutput = '0:v';
        let filterIndex = 0;
        const logoPath = this.getLogoPath();
        const hasLogo = !!logoPath;
        if (aspectRatio === 'original' && !topCaption && !bottomCaption && !hasLogo) {
            return null;
        }
        let dims = null;
        if (aspectRatio && aspectRatio !== 'original') {
            dims = this.calculatePaddedDimensions(inputWidth, inputHeight, aspectRatio);
        }
        if (dims) {
            const colorHex = paddingColor.replace('#', '');
            filters.push(`[${currentOutput}]scale=${dims.scaledWidth}:${dims.scaledHeight}[scaled${filterIndex}]`);
            currentOutput = `scaled${filterIndex}`;
            filterIndex++;
            filters.push(`[${currentOutput}]pad=${dims.outputWidth}:${dims.outputHeight}:${dims.padX}:${dims.padY}:color=#${colorHex}[padded${filterIndex}]`);
            currentOutput = `padded${filterIndex}`;
            filterIndex++;
        }
        const fontMap = {
            'sans-serif': 'Sans',
            serif: 'Serif',
            monospace: 'Monospace',
            arial: 'Arial',
            helvetica: 'Helvetica',
            times: 'Times',
            georgia: 'Georgia',
            impact: 'Impact',
        };
        const fontFamily = fontMap[captionFont] || 'Sans';
        const textColor = captionColor.startsWith('#')
            ? captionColor.slice(1)
            : captionColor;
        if (topCaption && topCaption.trim()) {
            const escapedText = topCaption.replace(/'/g, "\\'").replace(/:/g, '\\:');
            const xPos = '(w*50/100-text_w/2)';
            const yPos = '(h*10/100-text_h/2)';
            filters.push(`[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[top${filterIndex}]`);
            currentOutput = `top${filterIndex}`;
            filterIndex++;
        }
        if (bottomCaption && bottomCaption.trim()) {
            const escapedText = bottomCaption
                .replace(/'/g, "\\'")
                .replace(/:/g, '\\:');
            const xPos = '(w*50/100-text_w/2)';
            const yPos = '(h*90/100-text_h/2)';
            filters.push(`[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[bottom${filterIndex}]`);
            currentOutput = `bottom${filterIndex}`;
            filterIndex++;
        }
        if (hasLogo) {
            const outputWidth = dims ? dims.outputWidth : inputWidth;
            const logoW = Math.round(outputWidth * logoScale);
            const overlayX = `(W*${logoX}/100-w/2)`;
            const overlayY = `(H*${logoY}/100-h/2)`;
            filters.push(`[1:v]scale=${logoW}:-1[logo${filterIndex}]`);
            filters.push(`[${currentOutput}][logo${filterIndex}]overlay=${overlayX}:${overlayY}[final${filterIndex}]`);
            currentOutput = `final${filterIndex}`;
            filterIndex++;
        }
        if (filters.length > 0) {
            const lastFilter = filters[filters.length - 1];
            filters[filters.length - 1] = lastFilter.replace(/\[[^\]]+\]$/, '[vout]');
        }
        return {
            filterComplex: filters.join(';'),
            outputLabel: 'vout',
            hasLogo,
        };
    }
    async applyFraming(inputPath, options) {
        this.ensureTempDir();
        const dimensions = await this.getVideoDimensions(inputPath);
        const filterResult = this.buildFilterComplex({
            ...options,
            inputWidth: dimensions.width,
            inputHeight: dimensions.height,
        });
        if (!filterResult) {
            return inputPath;
        }
        const outputFileName = `${(0, uuid_1.v4)()}.mp4`;
        const outputPath = path.join(TEMP_DIR, outputFileName);
        const logoPath = this.getLogoPath();
        return new Promise((resolve, reject) => {
            let timeoutId;
            let command;
            const cleanup = () => {
                if (timeoutId)
                    clearTimeout(timeoutId);
            };
            timeoutId = setTimeout(() => {
                if (command)
                    command.kill('SIGKILL');
                cleanup();
                reject(new Error('Framing timeout - exceeded 10 minutes'));
            }, FRAMING_TIMEOUT);
            command = ffmpeg(inputPath);
            if (filterResult.hasLogo && logoPath) {
                command.input(logoPath);
            }
            command
                .complexFilter(filterResult.filterComplex)
                .outputOptions([
                '-map',
                `[${filterResult.outputLabel}]`,
                '-map',
                '0:a?',
                '-c:v',
                'libx264',
                '-preset',
                'fast',
                '-c:a',
                'aac',
            ])
                .output(outputPath)
                .on('end', () => {
                cleanup();
                resolve(outputPath);
            })
                .on('error', (err) => {
                cleanup();
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                reject(new Error(`Framing error: ${err.message}`));
            });
            command.run();
        });
    }
    deleteTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (err) {
            this.logger.error(`Failed to delete temp file: ${filePath}`);
        }
    }
};
exports.ClipsService = ClipsService;
exports.ClipsService = ClipsService = ClipsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drive_service_1.DriveService])
], ClipsService);
//# sourceMappingURL=clips.service.js.map