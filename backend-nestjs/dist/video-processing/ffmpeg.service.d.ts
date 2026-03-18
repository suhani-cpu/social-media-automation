import { VideoFormat } from './formats';
export interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    format: string;
    bitrate: number;
    fps: number;
    hasAudio: boolean;
    hasVideo: boolean;
    size: number;
}
export interface TranscodeOptions {
    inputPath: string;
    outputPath: string;
    format: VideoFormat;
    onProgress?: (progress: number) => void;
}
export declare class FfmpegService {
    private readonly logger;
    getVideoMetadata(inputPath: string): Promise<VideoMetadata>;
    validateVideo(inputPath: string): Promise<void>;
    transcodeVideo(options: TranscodeOptions): Promise<void>;
    extractThumbnail(inputPath: string, outputPath: string, timestamp: number): Promise<void>;
}
