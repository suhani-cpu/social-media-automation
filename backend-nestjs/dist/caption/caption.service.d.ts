import { ConfigService } from '@nestjs/config';
export interface CaptionRequest {
    videoTitle: string;
    videoDescription?: string;
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
    language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';
    tone: string[];
    context?: string;
}
export interface CaptionVariation {
    caption: string;
    hashtags: string[];
    characterCount: number;
}
export declare class CaptionService {
    private readonly configService;
    private readonly logger;
    private readonly model;
    constructor(configService: ConfigService);
    generate(request: CaptionRequest): Promise<CaptionVariation[]>;
    private generateWithAI;
    private generateFallback;
}
