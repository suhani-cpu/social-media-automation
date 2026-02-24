import { Module } from '@nestjs/common';
import { FfmpegCuttingService } from './ffmpeg-cutting.service';
import { FramingService } from './framing.service';

@Module({
  providers: [FfmpegCuttingService, FramingService],
  exports: [FfmpegCuttingService, FramingService],
})
export class VideoCuttingModule {}
