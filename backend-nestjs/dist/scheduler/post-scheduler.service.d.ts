import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
export declare class PostSchedulerService {
    private readonly prisma;
    private readonly postPublishingQueue;
    private readonly logger;
    constructor(prisma: PrismaService, postPublishingQueue: Queue);
    checkAndPublishScheduledPosts(): Promise<void>;
    getScheduledSummary(): Promise<{
        upcoming: number;
        today: number;
        thisWeek: number;
    }>;
    reschedule(postId: string, newScheduledFor: Date): Promise<void>;
}
