export interface VideoFormat {
    name: string;
    resolution: string;
    width: number;
    height: number;
    aspectRatio: string;
    videoBitrate: string;
    audioBitrate: string;
    fps: number;
    codec: string;
    audioCodec: string;
    format: string;
    maxDuration?: number;
    description: string;
}
export declare const FORMATS: Record<string, VideoFormat>;
export declare function getFormat(formatName: string): VideoFormat;
export declare function getAllFormatNames(): string[];
export declare const VIDEO_URL_FIELDS: Record<string, string>;
