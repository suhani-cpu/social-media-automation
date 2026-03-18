import { Controller, Get, Post, Delete, Param, Body, Req, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { VideosService } from './videos.service';
import { DriveService } from '../drive/drive.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream, existsSync, statSync, mkdirSync, appendFileSync, writeFileSync, unlinkSync } from 'fs';

const videoStorage = diskStorage({
  destination: (req, file, cb) => {
    const dir = '/tmp/uploads';
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const chunkStorage = diskStorage({
  destination: (req, file, cb) => {
    const dir = '/tmp/chunks';
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `chunk-${Date.now()}-${Math.round(Math.random() * 1e9)}`);
  },
});

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(
    private readonly videosService: VideosService,
    private readonly driveService: DriveService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('video', {
    storage: videoStorage,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new BadRequestException('Only video files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  upload(@CurrentUser() user: CurrentUserPayload, @UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) throw new BadRequestException('No video file uploaded');
    return this.videosService.upload(user.id, file, body);
  }

  /**
   * Initialize a chunked upload session
   */
  @Post('upload/init')
  initChunkedUpload(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { fileName: string; fileSize: number; totalChunks: number; title?: string },
  ) {
    if (!body.fileName || !body.fileSize || !body.totalChunks) {
      throw new BadRequestException('fileName, fileSize, and totalChunks are required');
    }
    const uploadId = `upload-${user.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = extname(body.fileName);
    const targetPath = join('/tmp/uploads', `${uploadId}${ext}`);

    // Create metadata file to track chunks
    const metaPath = join('/tmp/chunks', `${uploadId}.json`);
    mkdirSync('/tmp/chunks', { recursive: true });
    mkdirSync('/tmp/uploads', { recursive: true });
    writeFileSync(metaPath, JSON.stringify({
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

  /**
   * Upload a single chunk
   */
  @Post('upload/chunk')
  @UseInterceptors(FileInterceptor('chunk', {
    storage: chunkStorage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB per chunk
  }))
  uploadChunk(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { uploadId: string; chunkIndex: string },
  ) {
    if (!file) throw new BadRequestException('No chunk uploaded');
    if (!body.uploadId || body.chunkIndex === undefined) {
      throw new BadRequestException('uploadId and chunkIndex are required');
    }

    const metaPath = join('/tmp/chunks', `${body.uploadId}.json`);
    if (!existsSync(metaPath)) {
      throw new NotFoundException('Upload session not found. Please start a new upload.');
    }

    const meta = JSON.parse(require('fs').readFileSync(metaPath, 'utf8'));
    if (meta.userId !== user.id) {
      throw new BadRequestException('Unauthorized upload session');
    }

    const chunkIndex = parseInt(body.chunkIndex, 10);

    // Append chunk data to target file
    const chunkData = require('fs').readFileSync(file.path);
    appendFileSync(meta.targetPath, chunkData);

    // Clean up chunk temp file
    try { unlinkSync(file.path); } catch {}

    // Update metadata
    meta.receivedChunks.push(chunkIndex);
    writeFileSync(metaPath, JSON.stringify(meta));

    this.logger.log(`Chunk ${chunkIndex + 1}/${meta.totalChunks} received for ${body.uploadId}`);

    return {
      chunkIndex,
      received: meta.receivedChunks.length,
      total: meta.totalChunks,
    };
  }

  /**
   * Complete chunked upload — create video record
   */
  @Post('upload/complete')
  async completeChunkedUpload(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { uploadId: string; title?: string },
  ) {
    if (!body.uploadId) throw new BadRequestException('uploadId is required');

    const metaPath = join('/tmp/chunks', `${body.uploadId}.json`);
    if (!existsSync(metaPath)) {
      throw new NotFoundException('Upload session not found');
    }

    const meta = JSON.parse(require('fs').readFileSync(metaPath, 'utf8'));
    if (meta.userId !== user.id) {
      throw new BadRequestException('Unauthorized upload session');
    }

    if (meta.receivedChunks.length < meta.totalChunks) {
      throw new BadRequestException(
        `Missing chunks: received ${meta.receivedChunks.length}/${meta.totalChunks}`
      );
    }

    // Verify file exists
    if (!existsSync(meta.targetPath)) {
      throw new NotFoundException('Assembled file not found');
    }

    const stat = statSync(meta.targetPath);
    const title = body.title || meta.title;

    // Create video record via service
    const fakeFile = {
      path: meta.targetPath,
      originalname: meta.fileName,
      size: stat.size,
      mimetype: `video/${extname(meta.fileName).slice(1) || 'mp4'}`,
    } as Express.Multer.File;

    const result = await this.videosService.upload(user.id, fakeFile, { title });

    // Clean up meta file
    try { unlinkSync(metaPath); } catch {}

    this.logger.log(`Chunked upload complete: ${body.uploadId} → video ${result.video.id}`);
    return result;
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.videosService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.videosService.findOne(user.id, id);
  }

  @Get(':id/stream')
  async stream(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { video } = await this.videosService.findOne(user.id, id);
    const filePath = video.rawVideoUrl;
    const metadata = video.metadata as Record<string, any> | null;
    const driveFileId = metadata?.driveFileId as string | undefined;

    // Case 1: Local file exists (local dev or recently uploaded)
    if (filePath && existsSync(filePath)) {
      return this.streamLocalFile(filePath, req, res);
    }

    // Case 2: Google Drive import — proxy stream from Drive
    if (driveFileId) {
      return this.streamFromDrive(user, driveFileId, metadata, res);
    }

    throw new NotFoundException('Video file not found. The file may have been removed from temporary storage.');
  }

  private streamLocalFile(filePath: string, req: Request, res: Response) {
    const stat = statSync(filePath);
    const fileSize = stat.size;
    const ext = extname(filePath).toLowerCase();
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

      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.set({
        'Content-Type': contentType,
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });

      createReadStream(filePath).pipe(res);
    }
  }

  private async streamFromDrive(
    user: CurrentUserPayload,
    driveFileId: string,
    metadata: Record<string, any> | null,
    res: Response,
  ) {
    try {
      this.logger.log(`Streaming video from Google Drive: ${driveFileId}`);

      // Download to temp first then stream (Drive API doesn't support range requests easily)
      const tempPath = await this.driveService.downloadToTemp(
        user.id,
        driveFileId,
        metadata?.driveFileName,
      );

      const stat = statSync(tempPath);
      const driveMimeType = metadata?.driveMimeType as string | undefined;
      const ext = extname(metadata?.driveFileName || '').toLowerCase();
      const contentType = driveMimeType || MIME_TYPES[ext] || 'video/mp4';

      res.set({
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });

      const stream = createReadStream(tempPath);
      stream.pipe(res);
    } catch (error: any) {
      this.logger.error(`Failed to stream from Drive: ${error.message}`);
      throw new NotFoundException('Failed to stream video from Google Drive. Please reconnect your Drive account.');
    }
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.videosService.remove(user.id, id);
  }
}
