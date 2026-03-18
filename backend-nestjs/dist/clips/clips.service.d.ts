import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
export interface ClipVideoDto {
    videoId: string;
    startTime: number;
    endTime: number;
    format?: string;
    overlay?: {
        topCaption?: string;
        bottomCaption?: string;
        captionFontSize?: number;
        captionColor?: string;
        captionFont?: string;
        paddingColor?: string;
        logoX?: number;
        logoY?: number;
        logoScale?: number;
    };
}
export declare class ClipsService {
    private readonly prisma;
    private readonly driveService;
    private readonly logger;
    private activeProcesses;
    private readonly queue;
    constructor(prisma: PrismaService, driveService: DriveService);
    clipVideo(userId: string, body: ClipVideoDto): Promise<{
        message: string;
        clip: {
            videoId: string;
            outputPath: string;
            fileSize: number;
            duration: number;
            format: string;
        };
    }>;
    private ensureTempDir;
    private processQueue;
    private cutClip;
    private getVideoDimensions;
    private calculatePaddedDimensions;
    private getLogoPath;
    private buildFilterComplex;
    private applyFraming;
    private deleteTempFile;
}
