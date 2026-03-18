export interface FramingOptions {
    aspectRatio?: string;
    paddingColor?: string;
    topCaption?: string;
    bottomCaption?: string;
    captionFontSize?: number;
    captionColor?: string;
    captionFont?: string;
    topCaptionX?: string;
    topCaptionY?: string;
    bottomCaptionX?: string;
    bottomCaptionY?: string;
    logoX?: number;
    logoY?: number;
    logoScale?: number;
    inputWidth?: number;
    inputHeight?: number;
}
export declare class FramingService {
    private readonly logger;
    private ensureTempDir;
    private getLogoPath;
    private calculatePaddedDimensions;
    private buildFilterComplex;
    private getVideoDimensions;
    applyFraming(inputPath: string, options: FramingOptions): Promise<string>;
}
