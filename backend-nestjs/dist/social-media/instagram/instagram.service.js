"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var InstagramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const ffmpeg_service_1 = require("../../video-processing/ffmpeg.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_service_1 = require("../../storage/storage.service");
const instagram_oauth_service_1 = require("../../oauth/services/instagram-oauth.service");
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';
let InstagramService = InstagramService_1 = class InstagramService {
    constructor(configService, prisma, storageService, instagramOAuth, ffmpegService) {
        this.configService = configService;
        this.prisma = prisma;
        this.storageService = storageService;
        this.instagramOAuth = instagramOAuth;
        this.ffmpegService = ffmpegService;
        this.logger = new common_1.Logger(InstagramService_1.name);
    }
    async publishToInstagram(post, video, account) {
        this.logger.log('Publishing to Instagram', {
            postId: post.id,
            videoId: video.id,
            accountId: account.id,
            postType: post.postType,
        });
        try {
            let videoUrl;
            if (post.postType === 'REEL') {
                videoUrl = video.instagramReelUrl;
            }
            else {
                videoUrl = video.instagramFeedUrl;
            }
            if (!videoUrl) {
                videoUrl = video.rawVideoUrl;
                this.logger.warn(`No processed Instagram ${post.postType} URL found, falling back to rawVideoUrl`);
            }
            if (!videoUrl) {
                throw new Error(`No video file available for Instagram upload. Video status: ${video.status}`);
            }
            let caption = post.caption;
            if (post.hashtags && post.hashtags.length > 0) {
                caption += '\n\n' + post.hashtags.join(' ');
            }
            if (caption.length > 2200) {
                caption = caption.substring(0, 2197) + '...';
            }
            let finalVideoUrl = videoUrl;
            let tempFile = null;
            let convertedFile = null;
            try {
                const ext = path.extname(videoUrl).split('?')[0].toLowerCase();
                if (ext && ext !== '.mp4' && videoUrl.startsWith('http')) {
                    this.logger.log('Non-MP4 video detected for Instagram, converting...', { ext });
                    tempFile = path.join(os.tmpdir(), `ig-download-${Date.now()}${ext}`);
                    convertedFile = path.join(os.tmpdir(), `ig-converted-${Date.now()}.mp4`);
                    await this.storageService.download(videoUrl, tempFile);
                    await new Promise((resolve, reject) => {
                        const ffmpeg = require('fluent-ffmpeg');
                        ffmpeg(tempFile)
                            .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-preset fast'])
                            .format('mp4')
                            .on('end', () => resolve())
                            .on('error', (err) => reject(err))
                            .save(convertedFile);
                    });
                    const s3Key = `converted/ig-${Date.now()}.mp4`;
                    await this.storageService.upload(convertedFile, s3Key);
                    finalVideoUrl = await this.storageService.getSignedUrl(s3Key, 3600);
                }
                const freshToken = await this.instagramOAuth.getValidAccessToken(account.id);
                const freshAccount = { ...account, accessToken: freshToken };
                const result = await this.uploadVideo(finalVideoUrl, caption, freshAccount);
                this.logger.log('Successfully published to Instagram', {
                    postId: post.id,
                    mediaId: result.id,
                    permalink: result.permalink,
                });
                return {
                    id: result.id,
                    permalink: result.permalink,
                };
            }
            finally {
                for (const f of [tempFile, convertedFile]) {
                    if (f && fs.existsSync(f)) {
                        try {
                            fs.unlinkSync(f);
                        }
                        catch { }
                    }
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to publish to Instagram:', {
                postId: post.id,
                videoId: video.id,
                accountId: account.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async uploadVideo(videoUrl, caption, account) {
        let resolvedUrl = videoUrl;
        let tempFile = null;
        try {
            if (!videoUrl.startsWith('http')) {
                tempFile = path.join(os.tmpdir(), `instagram-upload-${Date.now()}.mp4`);
                const publicUrl = await this.storageService.getSignedUrl(videoUrl, 3600);
                resolvedUrl = publicUrl;
            }
            const instagramAccountId = account.accountId;
            const accessToken = account.accessToken;
            this.logger.log('Creating Instagram media container', {
                instagramAccountId,
                videoUrl: resolvedUrl,
            });
            const createParams = {
                media_type: 'REELS',
                video_url: resolvedUrl,
                caption,
                share_to_feed: true,
                access_token: accessToken,
            };
            const createResponse = await axios_1.default.post(`${FACEBOOK_API_BASE}/${instagramAccountId}/media`, null, { params: createParams });
            const containerId = createResponse.data.id;
            this.logger.log('Media container created', { containerId });
            let status = 'IN_PROGRESS';
            let attempts = 0;
            const maxAttempts = 30;
            while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
                const statusResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${containerId}`, {
                    params: {
                        fields: 'status_code',
                        access_token: accessToken,
                    },
                });
                status = statusResponse.data.status_code;
                attempts++;
                this.logger.log('Checking container status', {
                    containerId,
                    status,
                    attempt: attempts,
                });
                if (status === 'ERROR' || status === 'EXPIRED') {
                    throw new Error(`Media processing failed with status: ${status}`);
                }
            }
            if (status !== 'FINISHED') {
                throw new Error(`Media processing timed out. Status: ${status}`);
            }
            const publishResponse = await axios_1.default.post(`${FACEBOOK_API_BASE}/${instagramAccountId}/media_publish`, null, {
                params: {
                    creation_id: containerId,
                    access_token: accessToken,
                },
            });
            const mediaId = publishResponse.data.id;
            this.logger.log('Media published to Instagram', { mediaId });
            const mediaResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${mediaId}`, {
                params: {
                    fields: 'id,permalink',
                    access_token: accessToken,
                },
            });
            const permalink = mediaResponse.data.permalink;
            this.logger.log('Instagram upload complete', { mediaId, permalink });
            return { id: mediaId, permalink };
        }
        catch (error) {
            this.logger.error('Instagram upload failed:', {
                instagramAccountId: account.accountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Instagram upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            if (tempFile && fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                    this.logger.log('Temp file cleaned up', { tempFile });
                }
                catch (cleanupError) {
                    this.logger.warn('Failed to cleanup temp file', {
                        tempFile,
                        error: cleanupError,
                    });
                }
            }
        }
    }
    async uploadPhoto(imageUrl, caption, account) {
        const instagramAccountId = account.accountId;
        const accessToken = account.accessToken;
        try {
            this.logger.log('Creating Instagram photo container', {
                instagramAccountId,
                imageUrl,
            });
            const createResponse = await axios_1.default.post(`${FACEBOOK_API_BASE}/${instagramAccountId}/media`, null, {
                params: {
                    image_url: imageUrl,
                    caption,
                    access_token: accessToken,
                },
            });
            const containerId = createResponse.data.id;
            this.logger.log('Photo container created', { containerId });
            const publishResponse = await axios_1.default.post(`${FACEBOOK_API_BASE}/${instagramAccountId}/media_publish`, null, {
                params: {
                    creation_id: containerId,
                    access_token: accessToken,
                },
            });
            const mediaId = publishResponse.data.id;
            const mediaResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${mediaId}`, {
                params: {
                    fields: 'id,permalink',
                    access_token: accessToken,
                },
            });
            const permalink = mediaResponse.data.permalink;
            this.logger.log('Instagram photo upload complete', {
                mediaId,
                permalink,
            });
            return { id: mediaId, permalink };
        }
        catch (error) {
            this.logger.error('Instagram photo upload failed:', error);
            throw new Error(`Instagram photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async fetchAnalytics(account, mediaId) {
        this.logger.log('Fetching Instagram insights', { mediaId });
        try {
            const accessToken = account.accessToken;
            const metrics = [
                'impressions',
                'reach',
                'likes',
                'comments',
                'shares',
                'saves',
                'video_views',
            ];
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/${mediaId}/insights`, {
                params: {
                    metric: metrics.join(','),
                    access_token: accessToken,
                },
            });
            const data = response.data.data;
            const analytics = {
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                saves: 0,
                reach: 0,
                impressions: 0,
                engagement: 0,
            };
            data.forEach((metric) => {
                const name = metric.name;
                const value = metric.values[0]?.value || 0;
                switch (name) {
                    case 'impressions':
                        analytics.impressions = value;
                        break;
                    case 'reach':
                        analytics.reach = value;
                        break;
                    case 'likes':
                        analytics.likes = value;
                        break;
                    case 'comments':
                        analytics.comments = value;
                        break;
                    case 'shares':
                        analytics.shares = value;
                        break;
                    case 'saves':
                        analytics.saves = value;
                        break;
                    case 'video_views':
                        analytics.views = value;
                        break;
                }
            });
            if (analytics.reach > 0) {
                const totalEngagements = analytics.likes +
                    analytics.comments +
                    analytics.shares +
                    analytics.saves;
                analytics.engagement = (totalEngagements / analytics.reach) * 100;
            }
            this.logger.log('Instagram insights fetched', {
                mediaId,
                views: analytics.views,
                likes: analytics.likes,
            });
            return analytics;
        }
        catch (error) {
            this.logger.error('Failed to fetch Instagram insights:', {
                mediaId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async fetchAccountInsights(account, period = 'day') {
        try {
            const metrics = [
                'impressions',
                'reach',
                'profile_views',
                'follower_count',
                'email_contacts',
                'phone_call_clicks',
                'text_message_clicks',
                'get_directions_clicks',
                'website_clicks',
            ];
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/${account.accountId}/insights`, {
                params: {
                    metric: metrics.join(','),
                    period,
                    access_token: account.accessToken,
                },
            });
            this.logger.log('Instagram account insights fetched', {
                instagramAccountId: account.accountId,
                period,
            });
            return response.data.data;
        }
        catch (error) {
            this.logger.error('Failed to fetch Instagram account insights:', {
                instagramAccountId: account.accountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch account insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getMediaDetails(account, mediaId) {
        try {
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/${mediaId}`, {
                params: {
                    fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
                    access_token: account.accessToken,
                },
            });
            this.logger.log('Instagram media details fetched', { mediaId });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to fetch Instagram media details:', {
                mediaId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch media details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteMedia(account, mediaId) {
        try {
            await axios_1.default.delete(`${FACEBOOK_API_BASE}/${mediaId}`, {
                params: {
                    access_token: account.accessToken,
                },
            });
            this.logger.log('Instagram media deleted', { mediaId });
        }
        catch (error) {
            this.logger.error('Failed to delete Instagram media:', {
                mediaId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    isValidInstagramMediaId(mediaId) {
        return /^\d+_\d+$/.test(mediaId) || /^\d+$/.test(mediaId);
    }
    extractInstagramMediaId(url) {
        const patterns = [
            /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
};
exports.InstagramService = InstagramService;
exports.InstagramService = InstagramService = InstagramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        instagram_oauth_service_1.InstagramOAuthService,
        ffmpeg_service_1.FfmpegService])
], InstagramService);
//# sourceMappingURL=instagram.service.js.map