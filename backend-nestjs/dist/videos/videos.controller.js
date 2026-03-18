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
var VideosController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const videos_service_1 = require("./videos.service");
const drive_service_1 = require("../drive/drive.service");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const videoStorage = (0, multer_1.diskStorage)({
    destination: (req, file, cb) => {
        const dir = '/tmp/uploads';
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `video-${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
    },
});
const chunkStorage = (0, multer_1.diskStorage)({
    destination: (req, file, cb) => {
        const dir = '/tmp/chunks';
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `chunk-${Date.now()}-${Math.round(Math.random() * 1e9)}`);
    },
});
const MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
};
let VideosController = VideosController_1 = class VideosController {
    constructor(videosService, driveService) {
        this.videosService = videosService;
        this.driveService = driveService;
        this.logger = new common_1.Logger(VideosController_1.name);
    }
    upload(user, file, body) {
        if (!file)
            throw new common_1.BadRequestException('No video file uploaded');
        return this.videosService.upload(user.id, file, body);
    }
    initChunkedUpload(user, body) {
        if (!body.fileName || !body.fileSize || !body.totalChunks) {
            throw new common_1.BadRequestException('fileName, fileSize, and totalChunks are required');
        }
        const uploadId = `upload-${user.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const ext = (0, path_1.extname)(body.fileName);
        const targetPath = (0, path_1.join)('/tmp/uploads', `${uploadId}${ext}`);
        const metaPath = (0, path_1.join)('/tmp/chunks', `${uploadId}.json`);
        (0, fs_1.mkdirSync)('/tmp/chunks', { recursive: true });
        (0, fs_1.mkdirSync)('/tmp/uploads', { recursive: true });
        (0, fs_1.writeFileSync)(metaPath, JSON.stringify({
            uploadId,
            userId: user.id,
            fileName: body.fileName,
            fileSize: body.fileSize,
            totalChunks: body.totalChunks,
            receivedChunks: [],
            targetPath,
            title: body.title || body.fileName.replace(/\.[^/.]+$/, ''),
            createdAt: new Date().toISOString(),
        }));
        this.logger.log(`Chunked upload initialized: ${uploadId} (${body.totalChunks} chunks, ${body.fileSize} bytes)`);
        return { uploadId, message: 'Upload session created' };
    }
    uploadChunk(user, file, body) {
        if (!file)
            throw new common_1.BadRequestException('No chunk uploaded');
        if (!body.uploadId || body.chunkIndex === undefined) {
            throw new common_1.BadRequestException('uploadId and chunkIndex are required');
        }
        const metaPath = (0, path_1.join)('/tmp/chunks', `${body.uploadId}.json`);
        if (!(0, fs_1.existsSync)(metaPath)) {
            throw new common_1.NotFoundException('Upload session not found. Please start a new upload.');
        }
        const meta = JSON.parse(require('fs').readFileSync(metaPath, 'utf8'));
        if (meta.userId !== user.id) {
            throw new common_1.BadRequestException('Unauthorized upload session');
        }
        const chunkIndex = parseInt(body.chunkIndex, 10);
        const chunkData = require('fs').readFileSync(file.path);
        (0, fs_1.appendFileSync)(meta.targetPath, chunkData);
        try {
            (0, fs_1.unlinkSync)(file.path);
        }
        catch { }
        meta.receivedChunks.push(chunkIndex);
        (0, fs_1.writeFileSync)(metaPath, JSON.stringify(meta));
        this.logger.log(`Chunk ${chunkIndex + 1}/${meta.totalChunks} received for ${body.uploadId}`);
        return {
            chunkIndex,
            received: meta.receivedChunks.length,
            total: meta.totalChunks,
        };
    }
    async completeChunkedUpload(user, body) {
        if (!body.uploadId)
            throw new common_1.BadRequestException('uploadId is required');
        const metaPath = (0, path_1.join)('/tmp/chunks', `${body.uploadId}.json`);
        if (!(0, fs_1.existsSync)(metaPath)) {
            throw new common_1.NotFoundException('Upload session not found');
        }
        const meta = JSON.parse(require('fs').readFileSync(metaPath, 'utf8'));
        if (meta.userId !== user.id) {
            throw new common_1.BadRequestException('Unauthorized upload session');
        }
        if (meta.receivedChunks.length < meta.totalChunks) {
            throw new common_1.BadRequestException(`Missing chunks: received ${meta.receivedChunks.length}/${meta.totalChunks}`);
        }
        if (!(0, fs_1.existsSync)(meta.targetPath)) {
            throw new common_1.NotFoundException('Assembled file not found');
        }
        const stat = (0, fs_1.statSync)(meta.targetPath);
        const title = body.title || meta.title;
        const fakeFile = {
            path: meta.targetPath,
            originalname: meta.fileName,
            size: stat.size,
            mimetype: `video/${(0, path_1.extname)(meta.fileName).slice(1) || 'mp4'}`,
        };
        const result = await this.videosService.upload(user.id, fakeFile, { title });
        try {
            (0, fs_1.unlinkSync)(metaPath);
        }
        catch { }
        this.logger.log(`Chunked upload complete: ${body.uploadId} → video ${result.video.id}`);
        return result;
    }
    findAll(user) {
        return this.videosService.findAll(user.id);
    }
    findOne(user, id) {
        return this.videosService.findOne(user.id, id);
    }
    async stream(user, id, req, res) {
        const { video } = await this.videosService.findOne(user.id, id);
        const filePath = video.rawVideoUrl;
        const metadata = video.metadata;
        const driveFileId = metadata?.driveFileId;
        if (filePath && (0, fs_1.existsSync)(filePath)) {
            return this.streamLocalFile(filePath, req, res);
        }
        if (driveFileId) {
            return this.streamFromDrive(user, driveFileId, metadata, res);
        }
        throw new common_1.NotFoundException('Video file not found. The file may have been removed from temporary storage.');
    }
    streamLocalFile(filePath, req, res) {
        const stat = (0, fs_1.statSync)(filePath);
        const fileSize = stat.size;
        const ext = (0, path_1.extname)(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'video/mp4';
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;
            res.status(206).set({
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
            });
            (0, fs_1.createReadStream)(filePath, { start, end }).pipe(res);
        }
        else {
            res.set({
                'Content-Type': contentType,
                'Content-Length': fileSize,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
            });
            (0, fs_1.createReadStream)(filePath).pipe(res);
        }
    }
    async streamFromDrive(user, driveFileId, metadata, res) {
        try {
            this.logger.log(`Streaming video from Google Drive: ${driveFileId}`);
            const tempPath = await this.driveService.downloadToTemp(user.id, driveFileId, metadata?.driveFileName);
            const stat = (0, fs_1.statSync)(tempPath);
            const driveMimeType = metadata?.driveMimeType;
            const ext = (0, path_1.extname)(metadata?.driveFileName || '').toLowerCase();
            const contentType = driveMimeType || MIME_TYPES[ext] || 'video/mp4';
            res.set({
                'Content-Type': contentType,
                'Content-Length': stat.size,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
            });
            const stream = (0, fs_1.createReadStream)(tempPath);
            stream.pipe(res);
        }
        catch (error) {
            this.logger.error(`Failed to stream from Drive: ${error.message}`);
            throw new common_1.NotFoundException('Failed to stream video from Google Drive. Please reconnect your Drive account.');
        }
    }
    remove(user, id) {
        return this.videosService.remove(user.id, id);
    }
};
exports.VideosController = VideosController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('video', {
        storage: videoStorage,
        limits: { fileSize: 1024 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('video/')) {
                return cb(new common_1.BadRequestException('Only video files are allowed'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('upload/init'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "initChunkedUpload", null);
__decorate([
    (0, common_1.Post)('upload/chunk'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('chunk', {
        storage: chunkStorage,
        limits: { fileSize: 4 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "uploadChunk", null);
__decorate([
    (0, common_1.Post)('upload/complete'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "completeChunkedUpload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/stream'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "stream", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], VideosController.prototype, "remove", null);
exports.VideosController = VideosController = VideosController_1 = __decorate([
    (0, common_1.Controller)('videos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [videos_service_1.VideosService,
        drive_service_1.DriveService])
], VideosController);
//# sourceMappingURL=videos.controller.js.map