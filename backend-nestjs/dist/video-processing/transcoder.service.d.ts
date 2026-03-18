import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FfmpegService } from './ffmpeg.service';
import { ThumbnailService } from './thumbnail.service';
export interface ProcessVideoOptions {
    videoId: string;
    onProgress?: (stage: string, progress: number) => void;
}
export declare class TranscoderService {
    private readonly prisma;
    private readonly storage;
    private readonly ffmpegService;
    private readonly thumbnailService;
    private readonly logger;
    constructor(prisma: PrismaService, storage: StorageService, ffmpegService: FfmpegService, thumbnailService: ThumbnailService);
    processVideo(options: ProcessVideoOptions): Promise<void>;
}
