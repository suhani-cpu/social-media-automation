import { ConfigService } from '@nestjs/config';
import { Post, Video, SocialAccount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { FacebookOAuthService } from '../../oauth/services/facebook-oauth.service';
export interface FacebookUploadOptions {
    videoPath: string;
    title: string;
    description: string;
    published?: boolean;
}
export interface FacebookUploadResult {
    id: string;
    permalink: string;
}
export interface FacebookAnalytics {
    views: number;
    uniqueViews: number;
    likes: number;
    comments: number;
    shares: number;
    reactions: number;
    avgWatchTime?: number;
}
export declare class FacebookService {
    private readonly configService;
    private readonly prisma;
    private readonly storageService;
    private readonly facebookOAuth;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, storageService: StorageService, facebookOAuth: FacebookOAuthService);
    publishToFacebook(post: Post, video: Video, account: SocialAccount): Promise<{
        id: string;
        permalink: string;
    }>;
    uploadVideo(filePath: string, title: string, description: string, account: SocialAccount, published?: boolean): Promise<FacebookUploadResult>;
    private simpleUpload;
    private resumableUpload;
    getInsights(account: SocialAccount, postId: string): Promise<FacebookAnalytics>;
    getPageInsights(account: SocialAccount, period?: 'day' | 'week' | 'days_28'): Promise<any>;
    getVideoDetails(account: SocialAccount, videoId: string): Promise<any>;
    updateVideo(account: SocialAccount, videoId: string, updates: {
        title?: string;
        description?: string;
        published?: boolean;
    }): Promise<void>;
    deleteVideo(account: SocialAccount, videoId: string): Promise<void>;
    isValidFacebookVideoId(videoId: string): boolean;
    extractFacebookVideoId(url: string): string | null;
}
