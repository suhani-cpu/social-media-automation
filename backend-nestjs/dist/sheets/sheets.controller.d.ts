import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SheetsService } from './sheets.service';
export declare class SheetsController {
    private readonly sheetsService;
    constructor(sheetsService: SheetsService);
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
    importFromSheet(user: CurrentUserPayload, body: {
        sheetUrl: string;
    }): Promise<{
        message: string;
        summary: {
            total: number;
            succeeded: number;
            failed: number;
        };
        results: any[];
    }>;
}
