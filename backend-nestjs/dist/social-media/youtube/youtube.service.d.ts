import { ConfigService } from '@nestjs/config';
import { Post, Video, SocialAccount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { YouTubeOAuthService } from '../../oauth/services/youtube-oauth.service';
import { FfmpegService } from '../../video-processing/ffmpeg.service';
export type ProgressStage = 'downloading' | 'converting' | 'uploading' | 'done' | 'error';
export interface UploadProgress {
    stage: ProgressStage;
    percent: number;
    message: string;
}
export interface YouTubeUploadOptions {
    videoPath: string;
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    language?: string;
    privacyStatus?: 'public' | 'private' | 'unlisted';
    isShort?: boolean;
    madeForKids?: boolean;
}
export interface YouTubeUploadResult {
    id: string;
    url: string;
    title: string;
    description: string;
    publishedAt: string;
}
export interface YouTubeAnalytics {
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
    favorites: number;
    duration?: string;
    averageViewDuration?: number;
    watchTimeMinutes?: number;
}
export declare class YouTubeService {
    private readonly configService;
    private readonly prisma;
    private readonly storageService;
    private readonly youtubeOAuth;
    private readonly ffmpegService;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, storageService: StorageService, youtubeOAuth: YouTubeOAuthService, ffmpegService: FfmpegService);
    publishToYouTube(post: Post, video: Video, account: SocialAccount, onProgress?: (progress: UploadProgress) => void): Promise<{
        id: string;
        url: string;
    }>;
    uploadVideo(filePath: string, metadata: YouTubeUploadOptions, account: SocialAccount, onProgress?: (progress: UploadProgress) => void): Promise<YouTubeUploadResult>;
    private convertToMp4;
    fetchAnalytics(account: SocialAccount, videoId: string): Promise<YouTubeAnalytics>;
    fetchDetailedAnalytics(account: SocialAccount, videoId: string, startDate: string, endDate: string): Promise<any>;
    getChannelInfo(account: SocialAccount): Promise<any>;
    updateVideo(account: SocialAccount, videoId: string, updates: {
        title?: string;
        description?: string;
        tags?: string[];
        categoryId?: string;
        privacyStatus?: 'public' | 'private' | 'unlisted';
    }): Promise<void>;
    deleteVideo(account: SocialAccount, videoId: string): Promise<void>;
    private mapLanguageToYouTubeCode;
    isValidYouTubeVideoId(videoId: string): boolean;
    extractYouTubeVideoId(url: string): string | null;
}
