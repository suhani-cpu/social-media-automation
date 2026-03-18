import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { PostSchedulerService } from './post-scheduler.service';
export declare class CronJobsService {
    private readonly prisma;
    private readonly postScheduler;
    private readonly analyticsSyncQueue;
    private readonly logger;
    constructor(prisma: PrismaService, postScheduler: PostSchedulerService, analyticsSyncQueue: Queue);
    checkScheduledPosts(): Promise<void>;
    refreshExpiringTokens(): Promise<void>;
    syncAllPublishedPosts(): Promise<void>;
    cleanupOldData(): Promise<void>;
}
