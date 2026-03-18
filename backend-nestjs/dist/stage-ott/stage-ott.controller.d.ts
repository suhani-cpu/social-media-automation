import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { StageOttService } from './stage-ott.service';
export declare class StageOttController {
    private readonly stageOttService;
    constructor(stageOttService: StageOttService);
    listContent(page?: string, perPage?: string, sortBy?: string, sortOrder?: string, dialect?: string): Promise<import("./stage-ott.service").StageContentResponse>;
    importContent(user: CurrentUserPayload, body: {
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
    importMultiple(user: CurrentUserPayload, body: {
        items: Array<{
            oldContentId: number;
            title: string;
            description?: string;
            thumbnailURL?: string;
            dialect?: string;
            duration?: number;
            slug?: string;
            contentType?: string;
            format?: string;
        }>;
    }): Promise<{
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
