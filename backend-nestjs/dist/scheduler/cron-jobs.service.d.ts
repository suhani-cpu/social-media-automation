import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { PostSchedulerService } from './post-scheduler.service';
import { YouTubeOAuthService } from '../oauth/services/youtube-oauth.service';
export declare class CronJobsService {
    private readonly prisma;
    private readonly postScheduler;
    private readonly youtubeOAuth;
    private readonly analyticsSyncQueue;
    private readonly logger;
    constructor(prisma: PrismaService, postScheduler: PostSchedulerService, youtubeOAuth: YouTubeOAuthService, analyticsSyncQueue: Queue);
    checkScheduledPosts(): Promise<void>;
    resetStuckPublishingPosts(): Promise<void>;
    refreshExpiringTokens(): Promise<void>;
    syncAllPublishedPosts(): Promise<void>;
    cleanupOldData(): Promise<void>;
}
