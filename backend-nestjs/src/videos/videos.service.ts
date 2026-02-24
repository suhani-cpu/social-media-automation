import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('video-processing') private readonly videoQueue: Queue,
  ) {}

  async upload(userId: string, file: Express.Multer.File, body: { title?: string; description?: string; language?: string }) {
    const video = await this.prisma.video.create({
      data: {
        userId,
        title: body.title || 'Untitled Video',
        description: body.description,
        language: body.language || 'HINGLISH',
        sourceType: 'MANUAL',
        status: 'PENDING',
        rawVideoUrl: file.path,
      },
    });

    await this.videoQueue.add(
      { videoId: video.id, userId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(`Video processing job queued for video ${video.id}`);
    return { message: 'Video uploaded successfully', video };
  }

  async findAll(userId: string) {
    const videos = await this.prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, description: true, status: true,
        thumbnailUrl: true, duration: true, fileSize: true,
        rawVideoUrl: true, createdAt: true,
      },
    });
    return { videos };
  }

  async findOne(userId: string, id: string) {
    const video = await this.prisma.video.findFirst({ where: { id, userId } });
    if (!video) throw new NotFoundException('Video not found');
    return { video };
  }

  async remove(userId: string, id: string) {
    const video = await this.prisma.video.findFirst({ where: { id, userId } });
    if (!video) throw new NotFoundException('Video not found');

    const filesToDelete = [
      video.rawVideoUrl, video.instagramReelUrl, video.youtubeShortsUrl,
      video.youtubeVideoUrl, video.facebookSquareUrl, video.facebookLandscapeUrl,
      video.thumbnailUrl,
    ].filter((url): url is string => url !== null);

    for (const filePath of filesToDelete) {
      try { await fs.unlink(filePath); } catch { /* ignore */ }
    }

    await this.prisma.video.delete({ where: { id } });
    this.logger.log(`Video ${id} deleted by user ${userId}`);
    return { message: 'Video deleted successfully', videoId: id };
  }
}
