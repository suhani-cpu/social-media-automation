import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    createdTime?: string;
    modifiedTime?: string;
    webViewLink?: string;
    thumbnailLink?: string;
    isFolder: boolean;
}
export interface DriveFolder {
    id: string;
    name: string;
    createdTime?: string;
}
export declare class DriveService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private pendingStates;
    constructor(prisma: PrismaService, configService: ConfigService);
    private getOAuth2Client;
    private getAuthenticatedClient;
    private refreshAccessToken;
    private getDriveClient;
    startAuth(userId: string): Promise<{
        authUrl: string;
    }>;
    handleCallback(code: string, state: string): Promise<string>;
    getStatus(userId: string): Promise<{
        connected: boolean;
        account: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            username: string;
        } | null;
    }>;
    disconnect(userId: string): Promise<{
        message: string;
    }>;
    listFolders(userId: string, parentId?: string): Promise<{
        folders: DriveFolder[];
    }>;
    listFiles(userId: string, folderId?: string, videosOnly?: boolean): Promise<{
        files: DriveFile[];
    }>;
    private downloadFile;
    importVideo(userId: string, fileId: string, title?: string): Promise<{
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
    downloadToTemp(userId: string, driveFileId: string, fileName?: string): Promise<string>;
    importMultiple(userId: string, fileIds: string[]): Promise<{
        message: string;
        results: {
            success: boolean;
            fileId: string;
            videoId?: string;
            fileName?: string;
            error?: string;
        }[];
    }>;
    getFileMetadata(userId: string, fileId: string): Promise<{
        file: DriveFile;
    }>;
    private getFileMetadataFromDrive;
}
