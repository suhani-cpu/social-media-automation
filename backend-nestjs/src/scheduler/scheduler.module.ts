import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CronJobsService } from './cron-jobs.service';
import { PostSchedulerService } from './post-scheduler.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'post-publishing' },
      { name: 'analytics-sync' },
    ),
  ],
  providers: [CronJobsService, PostSchedulerService],
  exports: [PostSchedulerService],
})
export class SchedulerModule {}
