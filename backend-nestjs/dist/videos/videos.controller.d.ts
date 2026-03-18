import { Request, Response } from 'express';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { VideosService } from './videos.service';
import { DriveService } from '../drive/drive.service';
export declare class VideosController {
    private readonly videosService;
    private readonly driveService;
    private readonly logger;
    constructor(videosService: VideosService, driveService: DriveService);
    upload(user: CurrentUserPayload, file: Express.Multer.File, body: any): Promise<{
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
    initChunkedUpload(user: CurrentUserPayload, body: {
        fileName: string;
        fileSize: number;
        totalChunks: number;
        title?: string;
    }): {
        uploadId: string;
        message: string;
    };
    uploadChunk(user: CurrentUserPayload, file: Express.Multer.File, body: {
        uploadId: string;
        chunkIndex: string;
    }): {
        chunkIndex: number;
        received: any;
        total: any;
    };
    completeChunkedUpload(user: CurrentUserPayload, body: {
        uploadId: string;
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
    findAll(user: CurrentUserPayload): Promise<{
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
    findOne(user: CurrentUserPayload, id: string): Promise<{
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
    stream(user: CurrentUserPayload, id: string, req: Request, res: Response): Promise<void>;
    private streamLocalFile;
    private streamFromDrive;
    remove(user: CurrentUserPayload, id: string): Promise<{
        message: string;
        videoId: string;
    }>;
}
