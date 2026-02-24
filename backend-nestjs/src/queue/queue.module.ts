import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VideoProcessingProcessor } from './video-processing.processor';
import { PostPublishingProcessor } from './post-publishing.processor';
import { AnalyticsSyncProcessor } from './analytics-sync.processor';
import { VideoProcessingModule } from '../video-processing/video-processing.module';
import { SocialMediaModule } from '../social-media/social-media.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'video-processing' },
      { name: 'post-publishing' },
      { name: 'analytics-sync' },
    ),
    forwardRef(() => VideoProcessingModule),
    forwardRef(() => SocialMediaModule),
    forwardRef(() => AnalyticsModule),
  ],
  providers: [
    VideoProcessingProcessor,
    PostPublishingProcessor,
    AnalyticsSyncProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
