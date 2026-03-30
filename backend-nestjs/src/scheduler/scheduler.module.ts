import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CronJobsService } from './cron-jobs.service';
import { PostSchedulerService } from './post-scheduler.service';
import { CronController } from './cron.controller';
import { PostsModule } from '../posts/posts.module';
import { OAuthModule } from '../oauth/oauth.module';

@Module({
  imports: [
    ConfigModule,
    PostsModule,
    OAuthModule,
    BullModule.registerQueue(
      { name: 'post-publishing' },
      { name: 'analytics-sync' },
    ),
  ],
  controllers: [CronController],
  providers: [CronJobsService, PostSchedulerService],
  exports: [PostSchedulerService],
})
export class SchedulerModule {}
