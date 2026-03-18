import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { TranscoderService } from '../video-processing/transcoder.service';
export interface VideoProcessingJobData {
    videoId: string;
    userId: string;
}
export declare class VideoProcessingProcessor {
    private readonly prisma;
    private readonly transcoder;
    private readonly logger;
    constructor(prisma: PrismaService, transcoder: TranscoderService);
    handle(job: Job<VideoProcessingJobData>): Promise<void>;
}
