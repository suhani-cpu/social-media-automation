import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService, UploadProgress } from '../social-media/youtube/youtube.service';
import { InstagramService } from '../social-media/instagram/instagram.service';
import { FacebookService } from '../social-media/facebook/facebook.service';
import { DriveService } from '../drive/drive.service';
export declare class PostsService implements OnModuleInit {
    private readonly prisma;
    private readonly configService;
    private readonly youtubeService;
    private readonly instagramService;
    private readonly facebookService;
    private readonly driveService;
    private readonly logger;
    private redis;
    private readonly fallbackProgress;
    constructor(prisma: PrismaService, configService: ConfigService, youtubeService: YouTubeService, instagramService: InstagramService, facebookService: FacebookService, driveService: DriveService);
    onModuleInit(): void;
    private setProgress;
    private getProgress;
    private deleteProgress;
    create(userId: string, dto: {
        videoId: string;
        accountId: string;
        caption: string;
        language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';
        hashtags?: string[];
        platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
        postType: 'FEED' | 'REEL' | 'STORY' | 'VIDEO' | 'SHORT';
        scheduledFor?: string;
        metadata?: Record<string, any>;
    }): Promise<{
        message: string;
        post: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            platform: import(".prisma/client").$Enums.Platform;
            accountId: string;
            status: import(".prisma/client").$Enums.PostStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            thumbnailUrl: string | null;
            language: import(".prisma/client").$Enums.PostLanguage;
            videoId: string | null;
            caption: string;
            hashtags: string[];
            mentions: string[];
            postType: import(".prisma/client").$Enums.PostType;
            mediaUrl: string | null;
            scheduledFor: Date | null;
            publishedAt: Date | null;
            platformPostId: string | null;
            platformUrl: string | null;
            errorMessage: string | null;
            retryCount: number;
        };
    }>;
    findAll(userId: string): Promise<{
        posts: ({
            video: {
                id: string;
                title: string;
                thumbnailUrl: string | null;
            } | null;
            account: {
                id: string;
                platform: import(".prisma/client").$Enums.Platform;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            platform: import(".prisma/client").$Enums.Platform;
            accountId: string;
            status: import(".prisma/client").$Enums.PostStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            thumbnailUrl: string | null;
            language: import(".prisma/client").$Enums.PostLanguage;
            videoId: string | null;
            caption: string;
            hashtags: string[];
            mentions: string[];
            postType: import(".prisma/client").$Enums.PostType;
            mediaUrl: string | null;
            scheduledFor: Date | null;
            publishedAt: Date | null;
            platformPostId: string | null;
            platformUrl: string | null;
            errorMessage: string | null;
            retryCount: number;
        })[];
    }>;
    resetPost(userId: string, postId: string): Promise<{
        message: string;
        post: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            platform: import(".prisma/client").$Enums.Platform;
            accountId: string;
            status: import(".prisma/client").$Enums.PostStatus;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            thumbnailUrl: string | null;
            language: import(".prisma/client").$Enums.PostLanguage;
            videoId: string | null;
            caption: string;
            hashtags: string[];
            mentions: string[];
            postType: import(".prisma/client").$Enums.PostType;
            mediaUrl: string | null;
            scheduledFor: Date | null;
            publishedAt: Date | null;
            platformPostId: string | null;
            platformUrl: string | null;
            errorMessage: string | null;
            retryCount: number;
        };
    }>;
    publish(userId: string, postId: string): Promise<{
        message: string;
        postId: string;
        platformUrl?: undefined;
        status?: undefined;
    } | {
        message: string;
        postId: string;
        platformUrl: string | null;
        status?: undefined;
    } | {
        message: string;
        postId: string;
        status: "FAILED" | "DRAFT" | "SCHEDULED" | "PUBLISHING" | "DELETED" | undefined;
        platformUrl?: undefined;
    }>;
    getPublishProgress(postId: string): Promise<UploadProgress>;
    private executePublish;
    batchPublish(userId: string, postIds: string[]): Promise<{
        message: string;
        total: number;
        results: {
            postId: string;
            status: string;
            message: string;
        }[];
    }>;
    retryPublish(userId: string, postId: string): Promise<{
        message: string;
        postId: string;
        platformUrl: string | null;
        status?: undefined;
    } | {
        message: string;
        postId: string;
        status: "FAILED" | "DRAFT" | "SCHEDULED" | "PUBLISHING" | "DELETED" | undefined;
        platformUrl?: undefined;
    }>;
    delete(userId: string, postId: string): Promise<{
        message: string;
    }>;
    getScheduledSummary(): Promise<{
        message: string;
        summary: {
            total: number;
            byPlatform: Record<string, ({
                video: {
                    id: string;
                    title: string;
                    thumbnailUrl: string | null;
                } | null;
                account: {
                    id: string;
                    platform: import(".prisma/client").$Enums.Platform;
                    username: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                platform: import(".prisma/client").$Enums.Platform;
                accountId: string;
                status: import(".prisma/client").$Enums.PostStatus;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                thumbnailUrl: string | null;
                language: import(".prisma/client").$Enums.PostLanguage;
                videoId: string | null;
                caption: string;
                hashtags: string[];
                mentions: string[];
                postType: import(".prisma/client").$Enums.PostType;
                mediaUrl: string | null;
                scheduledFor: Date | null;
                publishedAt: Date | null;
                platformPostId: string | null;
                platformUrl: string | null;
                errorMessage: string | null;
                retryCount: number;
            })[]>;
            posts: ({
                video: {
                    id: string;
                    title: string;
                    thumbnailUrl: string | null;
                } | null;
                account: {
                    id: string;
                    platform: import(".prisma/client").$Enums.Platform;
                    username: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                platform: import(".prisma/client").$Enums.Platform;
                accountId: string;
                status: import(".prisma/client").$Enums.PostStatus;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                thumbnailUrl: string | null;
                language: import(".prisma/client").$Enums.PostLanguage;
                videoId: string | null;
                caption: string;
                hashtags: string[];
                mentions: string[];
                postType: import(".prisma/client").$Enums.PostType;
                mediaUrl: string | null;
                scheduledFor: Date | null;
                publishedAt: Date | null;
                platformPostId: string | null;
                platformUrl: string | null;
                errorMessage: string | null;
                retryCount: number;
            })[];
        };
    }>;
    reschedule(userId: string, postId: string, scheduledFor: string): Promise<{
        message: string;
        scheduledFor: Date;
    }>;
}
