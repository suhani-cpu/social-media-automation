import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramService } from '../social-media/instagram/instagram.service';
import { YouTubeService } from '../social-media/youtube/youtube.service';
import { FacebookService } from '../social-media/facebook/facebook.service';
export interface PostPublishingJobData {
    postId: string;
    userId: string;
}
export declare class PostPublishingProcessor {
    private readonly prisma;
    private readonly instagramService;
    private readonly youtubeService;
    private readonly facebookService;
    private readonly logger;
    constructor(prisma: PrismaService, instagramService: InstagramService, youtubeService: YouTubeService, facebookService: FacebookService);
    handle(job: Job<PostPublishingJobData>): Promise<void>;
}
