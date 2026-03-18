import { PrismaService } from '../prisma/prisma.service';
export declare class VideosService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    upload(userId: string, file: Express.Multer.File, body: {
        title?: string;
        description?: string;
        language?: string;
    }): Promise<{
        message: string;
        video: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import(".prisma/client").$Enums.VideoStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            category: string | null;
            title: string;
            description: string | null;
            sourceUrl: string | null;
            sourceType: import(".prisma/client").$Enums.SourceType;
            duration: number | null;
            fileSize: bigint | null;
            rawVideoUrl: string | null;
            thumbnailUrl: string | null;
            instagramReelUrl: string | null;
            instagramFeedUrl: string | null;
            youtubeShortsUrl: string | null;
            youtubeVideoUrl: string | null;
            youtubeSquareUrl: string | null;
            facebookSquareUrl: string | null;
            facebookLandscapeUrl: string | null;
            tags: string[];
            language: string | null;
            stageOttId: string | null;
            stageOttData: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }>;
    findAll(userId: string): Promise<{
        videos: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.VideoStatus;
            title: string;
            description: string | null;
            duration: number | null;
            fileSize: bigint | null;
            rawVideoUrl: string | null;
            thumbnailUrl: string | null;
        }[];
    }>;
    findOne(userId: string, id: string): Promise<{
        video: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import(".prisma/client").$Enums.VideoStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            category: string | null;
            title: string;
            description: string | null;
            sourceUrl: string | null;
            sourceType: import(".prisma/client").$Enums.SourceType;
            duration: number | null;
            fileSize: bigint | null;
            rawVideoUrl: string | null;
            thumbnailUrl: string | null;
            instagramReelUrl: string | null;
            instagramFeedUrl: string | null;
            youtubeShortsUrl: string | null;
            youtubeVideoUrl: string | null;
            youtubeSquareUrl: string | null;
            facebookSquareUrl: string | null;
            facebookLandscapeUrl: string | null;
            tags: string[];
            language: string | null;
            stageOttId: string | null;
            stageOttData: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }>;
    remove(userId: string, id: string): Promise<{
        message: string;
        videoId: string;
    }>;
}
