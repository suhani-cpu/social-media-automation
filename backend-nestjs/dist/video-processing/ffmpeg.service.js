"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FfmpegService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfmpegService = void 0;
const common_1 = require("@nestjs/common");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
let FfmpegService = FfmpegService_1 = class FfmpegService {
    constructor() {
        this.logger = new common_1.Logger(FfmpegService_1.name);
    }
    async getVideoMetadata(inputPath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(inputPath, (err, metadata) => {
                if (err) {
                    this.logger.error('FFprobe error:', err);
                    reject(new Error(`Failed to get video metadata: ${err.message}`));
                    return;
                }
                try {
                    const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                    const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
                    if (!videoStream) {
                        throw new Error('No video stream found in file');
                    }
                    const result = {
                        duration: metadata.format.duration || 0,
                        width: videoStream.width || 0,
                        height: videoStream.height || 0,
                        format: metadata.format.format_name || 'unknown',
                        bitrate: Number(metadata.format.bit_rate) || 0,
                        fps: videoStream.r_frame_rate
                            ? eval(videoStream.r_frame_rate)
                            : 30,
                        hasAudio: !!audioStream,
                        hasVideo: !!videoStream,
                        size: metadata.format.size || 0,
                    };
                    this.logger.log('Video metadata extracted', {
                        inputPath,
                        duration: result.duration,
                        resolution: `${result.width}x${result.height}`,
                        format: result.format,
                    });
                    resolve(result);
                }
                catch (error) {
                    reject(new Error(`Failed to parse video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            });
        });
    }
    async validateVideo(inputPath) {
        const metadata = await this.getVideoMetadata(inputPath);
        if (!metadata.hasVideo) {
            throw new Error('File does not contain a video stream');
        }
        if (metadata.duration <= 0) {
            throw new Error('Invalid video duration');
        }
        if (metadata.width <= 0 || metadata.height <= 0) {
            throw new Error('Invalid video dimensions');
        }
        this.logger.log('Video validation passed', { inputPath });
    }
    async transcodeVideo(options) {
        const { inputPath, outputPath, format, onProgress } = options;
        return new Promise((resolve, reject) => {
            this.logger.log('Starting video transcode', {
                inputPath,
                outputPath,
                format: format.name,
            });
            const command = (0, fluent_ffmpeg_1.default)(inputPath)
                .videoCodec(format.codec)
                .audioCodec(format.audioCodec)
                .size(format.resolution)
                .videoBitrate(format.videoBitrate)
                .audioBitrate(format.audioBitrate)
                .fps(format.fps)
                .aspect(format.aspectRatio)
                .format(format.format)
                .outputOptions([
                '-preset fast',
                '-movflags +faststart',
                '-pix_fmt yuv420p',
                '-profile:v baseline',
                '-level 3.0',
            ]);
            command.videoFilters([
                {
                    filter: 'scale',
                    options: {
                        w: format.width,
                        h: format.height,
                        force_original_aspect_ratio: 'decrease',
                    },
                },
                {
                    filter: 'pad',
                    options: {
                        w: format.width,
                        h: format.height,
                        x: '(ow-iw)/2',
                        y: '(oh-ih)/2',
                        color: 'black',
                    },
                },
            ]);
            if (format.maxDuration) {
                command.duration(format.maxDuration);
            }
            command.on('start', (commandLine) => {
                this.logger.log('FFmpeg command:', commandLine);
            });
            command.on('progress', (progress) => {
                const percent = progress.percent || 0;
                this.logger.debug(`Transcode progress: ${percent.toFixed(2)}%`, {
                    outputPath,
                });
                if (onProgress) {
                    onProgress(percent);
                }
            });
            command.on('end', () => {
                this.logger.log('Transcode completed', {
                    outputPath,
                    format: format.name,
                });
                resolve();
            });
            command.on('error', (err, stdout, stderr) => {
                this.logger.error('FFmpeg transcode error:', {
                    error: err.message,
                    stdout,
                    stderr,
                });
                reject(new Error(`Transcode failed: ${err.message}`));
            });
            command.save(outputPath);
        });
    }
    async extractThumbnail(inputPath, outputPath, timestamp) {
        return new Promise((resolve, reject) => {
            this.logger.log('Extracting thumbnail', {
                inputPath,
                outputPath,
                timestamp,
            });
            (0, fluent_ffmpeg_1.default)(inputPath)
                .screenshots({
                timestamps: [timestamp],
                filename: outputPath.split('/').pop(),
                folder: outputPath.substring(0, outputPath.lastIndexOf('/')),
                size: '1920x1080',
            })
                .on('end', () => {
                this.logger.log('Thumbnail extracted', { outputPath });
                resolve();
            })
                .on('error', (err) => {
                this.logger.error('Thumbnail extraction error:', err);
                reject(new Error(`Thumbnail extraction failed: ${err.message}`));
            });
        });
    }
};
exports.FfmpegService = FfmpegService;
exports.FfmpegService = FfmpegService = FfmpegService_1 = __decorate([
    (0, common_1.Injectable)()
], FfmpegService);
//# sourceMappingURL=ffmpeg.service.js.map