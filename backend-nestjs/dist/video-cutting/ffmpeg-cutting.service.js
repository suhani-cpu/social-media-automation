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
var FfmpegCuttingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfmpegCuttingService = void 0;
const common_1 = require("@nestjs/common");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const TEMP_DIR = path.join(process.cwd(), 'temp');
const MAX_DURATION = 600;
const MAX_CONCURRENT = 5;
const PROCESS_TIMEOUT = 5 * 60 * 1000;
let FfmpegCuttingService = FfmpegCuttingService_1 = class FfmpegCuttingService {
    constructor() {
        this.logger = new common_1.Logger(FfmpegCuttingService_1.name);
        this.activeProcesses = 0;
        this.queue = [];
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
        if (next) {
            next();
        }
    }
    async clipVideo(inputUrl, startSeconds, endSeconds) {
        const duration = endSeconds - startSeconds;
        if (duration <= 0) {
            throw new Error('End time must be after start time');
        }
        if (duration > MAX_DURATION) {
            throw new Error(`Max clip duration is ${MAX_DURATION / 60} minutes`);
        }
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
                    if (command) {
                        command.kill('SIGKILL');
                    }
                    cleanup();
                    reject(new Error('Processing timeout - exceeded 5 minutes'));
                }, PROCESS_TIMEOUT);
                command = (0, fluent_ffmpeg_1.default)(inputUrl)
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
    getQueueStatus() {
        return {
            activeProcesses: this.activeProcesses,
            queuedRequests: this.queue.length,
            maxConcurrent: MAX_CONCURRENT,
        };
    }
    deleteTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (err) {
            this.logger.error(`Failed to delete temp file: ${filePath}`, err);
        }
    }
};
exports.FfmpegCuttingService = FfmpegCuttingService;
exports.FfmpegCuttingService = FfmpegCuttingService = FfmpegCuttingService_1 = __decorate([
    (0, common_1.Injectable)()
], FfmpegCuttingService);
//# sourceMappingURL=ffmpeg-cutting.service.js.map