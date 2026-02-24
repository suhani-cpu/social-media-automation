import { Controller, Get, Post, Delete, Param, Body, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { VideosService } from './videos.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { createReadStream, existsSync, statSync } from 'fs';

const videoStorage = diskStorage({
  destination: '/tmp/uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

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
    @Res() res: Response,
  ) {
    const { video } = await this.videosService.findOne(user.id, id);
    const filePath = video.rawVideoUrl;

    if (!filePath || !existsSync(filePath)) {
      throw new NotFoundException('Video file not found');
    }

    const stat = statSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
    };

    res.set({
      'Content-Type': mimeTypes[ext] || 'video/mp4',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.videosService.remove(user.id, id);
  }
}
