import { PrismaService } from '../prisma/prisma.service';
export interface SheetVideoData {
    creativeName: string;
    description: string;
    headlines: string;
    metaStatic: string;
    googleStatic: string;
    videoWith1rsCTA: string;
    videoWithWatchNow: string;
    video16_9: string;
    video1_1: string;
    video9_16: string;
}
export interface ParsedVideo {
    title: string;
    description: string;
    headlines: string;
    driveLinks: string[];
    youtubeLinks: {
        landscape?: string;
        square?: string;
        vertical?: string;
    };
}
export declare class SheetsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    importFromSheet(userId: string, sheetUrl: string): Promise<{
        message: string;
        summary: {
            total: number;
            succeeded: number;
            failed: number;
        };
        results: any[];
    }>;
    previewSheet(sheetUrl: string): Promise<{
        message: string;
        summary: {
            totalVideos: number;
            vertical9_16Videos: number;
            videosWithDriveLinks: number;
            skipped: number;
        };
        videos: {
            title: string;
            description: string;
            driveLinksCount: number;
            has9_16: boolean;
        }[];
    }>;
    private fetchSheetData;
    private parseCSV;
    private parseCSVLine;
    private parseVideos;
    private extractDriveFileId;
}
