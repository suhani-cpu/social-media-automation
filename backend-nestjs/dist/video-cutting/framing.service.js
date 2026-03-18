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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FramingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FramingService = void 0;
const common_1 = require("@nestjs/common");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const TEMP_DIR = path.join(process.cwd(), 'temp');
const PROCESS_TIMEOUT = 10 * 60 * 1000;
const LOGO_PATH = path.join(process.cwd(), 'uploads', 'logo.png');
let FramingService = FramingService_1 = class FramingService {
    constructor() {
        this.logger = new common_1.Logger(FramingService_1.name);
    }
    ensureTempDir() {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
    }
    getLogoPath() {
        return fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
    }
    calculatePaddedDimensions(inputWidth, inputHeight, targetAspect) {
        const inputAspect = inputWidth / inputHeight;
        let outputWidth, outputHeight;
        const scaledWidth = inputWidth;
        const scaledHeight = inputHeight;
        if (targetAspect === '1:1') {
            const size = Math.max(inputWidth, inputHeight);
            outputWidth = size;
            outputHeight = size;
        }
        else if (targetAspect === '16:9') {
            const targetRatio = 16 / 9;
            if (inputAspect > targetRatio) {
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
            if (inputAspect > targetRatio) {
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
        return {
            outputWidth,
            outputHeight,
            scaledWidth,
            scaledHeight,
            padX,
            padY,
        };
    }
    buildFilterComplex(options) {
        const { aspectRatio, paddingColor = '#000000', topCaption, bottomCaption, captionFontSize = 24, captionColor = 'white', captionFont = 'sans-serif', topCaptionX = '50', topCaptionY = '10', bottomCaptionX = '50', bottomCaptionY = '90', logoX = 85, logoY = 15, logoScale = 0.15, inputWidth = 1920, inputHeight = 1080, } = options;
        const filters = [];
        let currentOutput = '0:v';
        let filterIndex = 0;
        const logoPath = this.getLogoPath();
        const hasLogo = !!logoPath;
        if (aspectRatio === 'original' &&
            !topCaption &&
            !bottomCaption &&
            !hasLogo) {
            return null;
        }
        let dims = null;
        if (aspectRatio && aspectRatio !== 'original') {
            dims = this.calculatePaddedDimensions(inputWidth, inputHeight, aspectRatio);
            this.logger.debug('=== FRAMING DEBUG ===');
            this.logger.debug(`Input: ${inputWidth} x ${inputHeight}`);
            this.logger.debug(`Aspect ratio: ${aspectRatio}`);
            this.logger.debug(`Output: ${dims.outputWidth} x ${dims.outputHeight}`);
            this.logger.debug(`Padding: ${dims.padX} ${dims.padY}`);
            this.logger.debug('==================');
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
            const escapedText = topCaption
                .replace(/'/g, "\\'")
                .replace(/:/g, '\\:');
            const xPercent = parseInt(topCaptionX, 10) || 50;
            const xPos = `(w*${xPercent}/100-text_w/2)`;
            const yPercent = parseInt(topCaptionY, 10) || 10;
            const yPos = `(h*${yPercent}/100-text_h/2)`;
            filters.push(`[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[top${filterIndex}]`);
            currentOutput = `top${filterIndex}`;
            filterIndex++;
        }
        if (bottomCaption && bottomCaption.trim()) {
            const escapedText = bottomCaption
                .replace(/'/g, "\\'")
                .replace(/:/g, '\\:');
            const xPercent = parseInt(bottomCaptionX, 10) || 50;
            const xPos = `(w*${xPercent}/100-text_w/2)`;
            const yPercent = parseInt(bottomCaptionY, 10) || 90;
            const yPos = `(h*${yPercent}/100-text_h/2)`;
            filters.push(`[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[bottom${filterIndex}]`);
            currentOutput = `bottom${filterIndex}`;
            filterIndex++;
        }
        if (hasLogo) {
            const outputWidth = dims ? dims.outputWidth : inputWidth;
            const logoW = Math.round(outputWidth * logoScale);
            const logoXPercent = parseInt(String(logoX), 10) || 85;
            const logoYPercent = parseInt(String(logoY), 10) || 15;
            const overlayX = `(W*${logoXPercent}/100-w/2)`;
            const overlayY = `(H*${logoYPercent}/100-h/2)`;
            filters.push(`[1:v]scale=${logoW}:-1[logo${filterIndex}]`);
            filters.push(`[${currentOutput}][logo${filterIndex}]overlay=${overlayX}:${overlayY}[final${filterIndex}]`);
            currentOutput = `final${filterIndex}`;
            filterIndex++;
        }
        if (filters.length > 0) {
            const lastFilter = filters[filters.length - 1];
            filters[filters.length - 1] = lastFilter.replace(/\[[^\]]+\]$/, '[vout]');
        }
        const result = {
            filterComplex: filters.join(';'),
            outputLabel: 'vout',
            hasLogo,
        };
        this.logger.debug(`Generated filter_complex: ${result.filterComplex}`);
        return result;
    }
    getVideoDimensions(inputPath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(inputPath, (err, metadata) => {
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
                    width: videoStream.width || 0,
                    height: videoStream.height || 0,
                    duration: metadata.format.duration || 0,
                });
            });
        });
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
                if (command) {
                    command.kill('SIGKILL');
                }
                cleanup();
                reject(new Error('Framing timeout - exceeded 10 minutes'));
            }, PROCESS_TIMEOUT);
            command = (0, fluent_ffmpeg_1.default)(inputPath);
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
};
exports.FramingService = FramingService;
exports.FramingService = FramingService = FramingService_1 = __decorate([
    (0, common_1.Injectable)()
], FramingService);
//# sourceMappingURL=framing.service.js.map