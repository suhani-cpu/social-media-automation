import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface StageContent {
    contentType: string;
    title: string;
    description: string;
    slug: string;
    dialect: string;
    language: string;
    duration: number;
    format: string;
    status: string;
    thumbnailURL: string;
    oldContentId: number;
    createdAt: string;
    updatedAt: string;
    releaseDate: string;
    createdBy: string;
}
export interface StageContentResponse {
    items: StageContent[];
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
}
export declare class StageOttService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly authToken;
    constructor(prisma: PrismaService, configService: ConfigService);
    private getHeaders;
    listContent(options: {
        page?: number;
        perPage?: number;
        sortBy?: string;
        sortOrder?: string;
        dialect?: string;
    }): Promise<StageContentResponse>;
    importContent(userId: string, stageContent: {
        oldContentId: number;
        title: string;
        description?: string;
        thumbnailURL?: string;
        dialect?: string;
        duration?: number;
        slug?: string;
        contentType?: string;
        format?: string;
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
        alreadyExists: boolean;
    }>;
    private cleanS3Url;
    importMultiple(userId: string, items: Array<{
        oldContentId: number;
        title: string;
        description?: string;
        thumbnailURL?: string;
        dialect?: string;
        duration?: number;
        slug?: string;
        contentType?: string;
        format?: string;
    }>): Promise<{
        message: string;
        results: {
            success: boolean;
            contentId: number;
            videoId?: string;
            title?: string;
            alreadyExists?: boolean;
            error?: string;
        }[];
    }>;
}
