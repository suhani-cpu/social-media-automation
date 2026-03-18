import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
export declare class CronController {
    private readonly configService;
    private readonly prisma;
    private readonly postsService;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, postsService: PostsService);
    processScheduledPosts(authHeader: string): Promise<{
        message: string;
        processed: number;
        published?: undefined;
        failed?: undefined;
        results?: undefined;
    } | {
        message: string;
        processed: number;
        published: number;
        failed: number;
        results: {
            postId: string;
            status: string;
            message: string;
        }[];
    }>;
    private verifyCronSecret;
}
