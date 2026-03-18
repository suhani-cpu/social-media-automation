import { Job } from 'bull';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
export interface AnalyticsSyncJobData {
    postId: string;
}
export declare class AnalyticsSyncProcessor {
    private readonly analyticsService;
    private readonly prisma;
    private readonly logger;
    constructor(analyticsService: AnalyticsService, prisma: PrismaService);
    handle(job: Job<AnalyticsSyncJobData>): Promise<void>;
}
