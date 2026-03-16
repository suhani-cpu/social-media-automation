import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { OAuthModule } from './oauth/oauth.module';
import { DriveModule } from './drive/drive.module';
import { VideosModule } from './videos/videos.module';
import { PostsModule } from './posts/posts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ClipsModule } from './clips/clips.module';
import { SheetsModule } from './sheets/sheets.module';
import { QueueModule } from './queue/queue.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StorageModule } from './storage/storage.module';
import { SocialMediaModule } from './social-media/social-media.module';
import { VideoProcessingModule } from './video-processing/video-processing.module';
import { VideoCuttingModule } from './video-cutting/video-cutting.module';
import { CaptionModule } from './caption/caption.module';
import { StageOttModule } from './stage-ott/stage-ott.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Scheduling (cron jobs)
    ScheduleModule.forRoot(),

    // Bull queues (optional — gracefully degrade if no REDIS_URL)
    ...(process.env.REDIS_URL
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              redis: configService.get<string>('REDIS_URL'),
            }),
            inject: [ConfigService],
          }),
        ]
      : []),

    // Core modules
    PrismaModule,
    StorageModule,
    SocialMediaModule,
    VideoProcessingModule,
    VideoCuttingModule,
    CaptionModule,
    QueueModule,

    // Feature modules
    AuthModule,
    AccountsModule,
    OAuthModule,
    DriveModule,
    VideosModule,
    PostsModule,
    AnalyticsModule,
    ClipsModule,
    SheetsModule,
    SchedulerModule,
    StageOttModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
