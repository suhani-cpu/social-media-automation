import { FfmpegService } from './ffmpeg.service';
export interface ThumbnailOptions {
    inputPath: string;
    outputDir: string;
    timestamps?: number[];
    count?: number;
}
export interface GeneratedThumbnail {
    path: string;
    timestamp: number;
    filename: string;
}
export declare class ThumbnailService {
    private readonly ffmpegService;
    private readonly logger;
    constructor(ffmpegService: FfmpegService);
    generateThumbnails(options: ThumbnailOptions): Promise<GeneratedThumbnail[]>;
    generateStandardThumbnails(inputPath: string, outputDir: string): Promise<GeneratedThumbnail[]>;
}
