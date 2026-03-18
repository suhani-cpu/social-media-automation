import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { DriveService } from './drive.service';
export declare class DriveController {
    private readonly driveService;
    private readonly configService;
    private readonly logger;
    constructor(driveService: DriveService, configService: ConfigService);
    startAuth(user: CurrentUserPayload): Promise<{
        authUrl: string;
    }>;
    handleCallback(code: string, state: string, oauthError: string, res: Response): Promise<void>;
    getStatus(user: CurrentUserPayload): Promise<{
        connected: boolean;
        account: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            username: string;
        } | null;
    }>;
    disconnect(user: CurrentUserPayload): Promise<{
        message: string;
    }>;
    listFolders(user: CurrentUserPayload, parentId?: string): Promise<{
        folders: import("./drive.service").DriveFolder[];
    }>;
    listFiles(user: CurrentUserPayload, folderId?: string, videosOnly?: string): Promise<{
        files: import("./drive.service").DriveFile[];
    }>;
    importVideo(user: CurrentUserPayload, body: {
        fileId: string;
        title?: string;
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
    importBatch(user: CurrentUserPayload, body: {
        fileIds: string[];
    }): Promise<{
        message: string;
        results: {
            success: boolean;
            fileId: string;
            videoId?: string;
            fileName?: string;
            error?: string;
        }[];
    }>;
    importMultiple(user: CurrentUserPayload, body: {
        fileIds: string[];
    }): Promise<{
        message: string;
        results: {
            success: boolean;
            fileId: string;
            videoId?: string;
            fileName?: string;
            error?: string;
        }[];
    }>;
    getFileMetadata(user: CurrentUserPayload, fileId: string): Promise<{
        file: import("./drive.service").DriveFile;
    }>;
}
