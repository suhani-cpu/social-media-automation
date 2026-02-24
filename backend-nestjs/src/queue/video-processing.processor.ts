import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { TranscoderService } from '../video-processing/transcoder.service';

export interface VideoProcessingJobData {
  videoId: string;
  userId: string;
}

@Processor('video-processing')
export class VideoProcessingProcessor {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcoder: TranscoderService,
  ) {}

  @Process()
  async handle(job: Job<VideoProcessingJobData>) {
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
    } catch (error) {
      this.logger.error(`Video processing failed for ${videoId}:`, error);
      throw error;
    }
  }
}
