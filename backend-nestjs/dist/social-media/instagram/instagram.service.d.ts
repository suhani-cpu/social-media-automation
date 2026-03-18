import { ConfigService } from '@nestjs/config';
import { Post, Video, SocialAccount } from '@prisma/client';
import { FfmpegService } from '../../video-processing/ffmpeg.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { InstagramOAuthService } from '../../oauth/services/instagram-oauth.service';
export interface InstagramUploadOptions {
    videoPath: string;
    caption: string;
    shareToFeed?: boolean;
    coverUrl?: string;
}
export interface InstagramUploadResult {
    id: string;
    permalink: string;
}
export interface InstagramAnalytics {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
    engagement: number;
}
export declare class InstagramService {
    private readonly configService;
    private readonly prisma;
    private readonly storageService;
    private readonly instagramOAuth;
    private readonly ffmpegService;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, storageService: StorageService, instagramOAuth: InstagramOAuthService, ffmpegService: FfmpegService);
    publishToInstagram(post: Post, video: Video, account: SocialAccount): Promise<{
        id: string;
        permalink: string;
    }>;
    uploadVideo(videoUrl: string, caption: string, account: SocialAccount): Promise<InstagramUploadResult>;
    uploadPhoto(imageUrl: string, caption: string, account: SocialAccount): Promise<InstagramUploadResult>;
    fetchAnalytics(account: SocialAccount, mediaId: string): Promise<InstagramAnalytics>;
    fetchAccountInsights(account: SocialAccount, period?: 'day' | 'week' | 'days_28'): Promise<any>;
    getMediaDetails(account: SocialAccount, mediaId: string): Promise<any>;
    deleteMedia(account: SocialAccount, mediaId: string): Promise<void>;
    isValidInstagramMediaId(mediaId: string): boolean;
    extractInstagramMediaId(url: string): string | null;
}
