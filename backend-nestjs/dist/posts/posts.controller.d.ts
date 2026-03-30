import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CaptionService } from '../caption/caption.service';
export declare class PostsController {
    private readonly postsService;
    private readonly captionService;
    constructor(postsService: PostsService, captionService: CaptionService);
    generateCaption(body: {
        videoTitle: string;
        videoDescription?: string;
        platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
        language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';
        tone?: string[];
        context?: string;
    }): Promise<{
        variations: import("../caption/caption.service").CaptionVariation[];
    }>;
    create(user: CurrentUserPayload, body: {
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
    findAll(user: CurrentUserPayload): Promise<{
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
    batchPublish(user: CurrentUserPayload, body: {
        postIds: string[];
    }): Promise<{
        message: string;
        total: number;
        results: {
            postId: string;
            status: string;
            message: string;
        }[];
    }>;
    publish(user: CurrentUserPayload, id: string): Promise<{
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
    resetPost(user: CurrentUserPayload, id: string): Promise<{
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
    retryPublish(user: CurrentUserPayload, id: string): Promise<{
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
    getPublishProgress(id: string): Promise<import("../social-media/youtube/youtube.service").UploadProgress>;
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
    reschedule(user: CurrentUserPayload, id: string, body: {
        scheduledFor: string;
    }): Promise<{
        message: string;
        scheduledFor: Date;
    }>;
    deletePost(user: CurrentUserPayload, id: string): Promise<{
        message: string;
    }>;
}
