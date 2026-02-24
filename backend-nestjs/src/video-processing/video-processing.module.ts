import { Module } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';
import { ThumbnailService } from './thumbnail.service';
import { TranscoderService } from './transcoder.service';

@Module({
  providers: [FfmpegService, ThumbnailService, TranscoderService],
  exports: [FfmpegService, ThumbnailService, TranscoderService],
})
export class VideoProcessingModule {}
