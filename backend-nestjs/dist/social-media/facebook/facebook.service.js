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
var FacebookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_service_1 = require("../../storage/storage.service");
const facebook_oauth_service_1 = require("../../oauth/services/facebook-oauth.service");
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';
let FacebookService = FacebookService_1 = class FacebookService {
    constructor(configService, prisma, storageService, facebookOAuth) {
        this.configService = configService;
        this.prisma = prisma;
        this.storageService = storageService;
        this.facebookOAuth = facebookOAuth;
        this.logger = new common_1.Logger(FacebookService_1.name);
    }
    async publishToFacebook(post, video, account) {
        this.logger.log('Publishing to Facebook', {
            postId: post.id,
            videoId: video.id,
            accountId: account.id,
            postType: post.postType,
        });
        try {
            let videoUrl;
            if (post.postType === 'FEED') {
                videoUrl = video.facebookSquareUrl;
            }
            else {
                videoUrl = video.facebookLandscapeUrl;
            }
            if (!videoUrl) {
                videoUrl = video.rawVideoUrl;
                this.logger.warn(`No processed Facebook ${post.postType} URL found, falling back to rawVideoUrl`);
            }
            if (!videoUrl) {
                throw new Error(`No video file available for Facebook upload. Video status: ${video.status}`);
            }
            let description = post.caption;
            if (post.hashtags && post.hashtags.length > 0) {
                description += '\n\n' + post.hashtags.join(' ');
            }
            const title = video.title || post.caption.substring(0, 100);
            const freshToken = await this.facebookOAuth.getValidAccessToken(account.id);
            const freshAccount = { ...account, accessToken: freshToken };
            const result = await this.uploadVideo(videoUrl, title, description, freshAccount);
            this.logger.log('Successfully published to Facebook', {
                postId: post.id,
                videoId: result.id,
                permalink: result.permalink,
            });
            return {
                id: result.id,
                permalink: result.permalink,
            };
        }
        catch (error) {
            this.logger.error('Failed to publish to Facebook:', {
                postId: post.id,
                videoId: video.id,
                accountId: account.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async uploadVideo(filePath, title, description, account, published = true) {
        let localVideoPath = filePath;
        let tempFile = null;
        let convertedFile = null;
        try {
            if (filePath.startsWith('http')) {
                tempFile = path.join(os.tmpdir(), `facebook-upload-${Date.now()}.mp4`);
                this.logger.log('Downloading video from storage for Facebook upload', { videoPath: filePath, tempFile });
                await this.storageService.download(filePath, tempFile);
                localVideoPath = tempFile;
            }
            if (!fs.existsSync(localVideoPath)) {
                throw new Error(`Video file not found: ${localVideoPath}`);
            }
            const fileExt = path.extname(localVideoPath).toLowerCase();
            if (fileExt && fileExt !== '.mp4') {
                this.logger.log('Converting video to MP4 for Facebook upload', { fileExt });
                convertedFile = path.join(os.tmpdir(), `fb-converted-${Date.now()}.mp4`);
                await new Promise((resolve, reject) => {
                    const ffmpeg = require('fluent-ffmpeg');
                    ffmpeg(localVideoPath)
                        .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-preset fast'])
                        .format('mp4')
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err))
                        .save(convertedFile);
                });
                localVideoPath = convertedFile;
            }
            const stats = fs.statSync(localVideoPath);
            const fileSize = stats.size;
            this.logger.log('Uploading video to Facebook', {
                pageId: account.accountId,
                title,
                fileSize,
            });
            if (fileSize > 25 * 1024 * 1024) {
                return await this.resumableUpload(account.accountId, account.accessToken, localVideoPath, title, description, published);
            }
            else {
                return await this.simpleUpload(account.accountId, account.accessToken, localVideoPath, title, description, published);
            }
        }
        catch (error) {
            this.logger.error('Facebook upload failed:', {
                pageId: account.accountId,
                title,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Facebook upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        finally {
            for (const f of [tempFile, convertedFile]) {
                if (f && fs.existsSync(f)) {
                    try {
                        fs.unlinkSync(f);
                        this.logger.log('Temp file cleaned up', { file: f });
                    }
                    catch (cleanupError) {
                        this.logger.warn('Failed to cleanup temp file', { file: f, error: cleanupError });
                    }
                }
            }
        }
    }
    async simpleUpload(pageId, accessToken, videoPath, title, description, published) {
        try {
            this.logger.log('Using simple upload method (multipart)');
            const FormData = require('form-data');
            const form = new FormData();
            form.append('source', fs.createReadStream(videoPath));
            form.append('title', title);
            form.append('description', description);
            form.append('published', String(published));
            form.append('access_token', accessToken);
            const response = await axios_1.default.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, form, { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity });
            const videoId = response.data.id;
            const permalink = `https://www.facebook.com/${videoId}`;
            this.logger.log('Facebook video uploaded (simple)', { videoId });
            return { id: videoId, permalink };
        }
        catch (error) {
            this.logger.error('Simple upload failed:', error);
            throw error;
        }
    }
    async resumableUpload(pageId, accessToken, videoPath, title, description, published) {
        try {
            this.logger.log('Using resumable upload method');
            const fileSize = fs.statSync(videoPath).size;
            const initResponse = await axios_1.default.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, {
                upload_phase: 'start',
                file_size: fileSize,
                access_token: accessToken,
            });
            const uploadSessionId = initResponse.data.upload_session_id;
            const startOffset = initResponse.data.start_offset;
            const endOffset = initResponse.data.end_offset;
            this.logger.log('Upload session initialized', {
                uploadSessionId,
                startOffset,
                endOffset,
            });
            const fileStream = fs.createReadStream(videoPath, {
                start: startOffset,
                end: endOffset - 1,
            });
            await axios_1.default.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, {
                upload_phase: 'transfer',
                upload_session_id: uploadSessionId,
                start_offset: startOffset,
                video_file_chunk: fileStream,
                access_token: accessToken,
            }, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            this.logger.log('Video uploaded to Facebook');
            const finishResponse = await axios_1.default.post(`${FACEBOOK_API_BASE}/${pageId}/videos`, {
                upload_phase: 'finish',
                upload_session_id: uploadSessionId,
                title,
                description,
                published,
                access_token: accessToken,
            });
            const success = finishResponse.data.success;
            if (!success) {
                throw new Error('Upload finalization failed');
            }
            this.logger.log('Upload finalized');
            const videoId = uploadSessionId;
            const permalink = `https://www.facebook.com/${pageId}/videos`;
            return { id: videoId, permalink };
        }
        catch (error) {
            this.logger.error('Resumable upload failed:', error);
            throw error;
        }
    }
    async getInsights(account, postId) {
        this.logger.log('Fetching Facebook insights', { videoId: postId });
        try {
            const accessToken = account.accessToken;
            const insightsResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${postId}/video_insights`, {
                params: {
                    metric: [
                        'total_video_views',
                        'total_video_views_unique',
                        'total_video_avg_time_watched',
                    ].join(','),
                    access_token: accessToken,
                },
            });
            const videoResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${postId}`, {
                params: {
                    fields: 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
                    access_token: accessToken,
                },
            });
            const insights = insightsResponse.data.data.reduce((acc, metric) => {
                const name = metric.name;
                const value = metric.values[0]?.value || 0;
                acc[name] = value;
                return acc;
            }, {});
            const engagement = videoResponse.data;
            const analytics = {
                views: insights.total_video_views || 0,
                uniqueViews: insights.total_video_views_unique || 0,
                likes: engagement.likes?.summary?.total_count || 0,
                comments: engagement.comments?.summary?.total_count || 0,
                shares: engagement.shares?.count || 0,
                reactions: engagement.reactions?.summary?.total_count || 0,
                avgWatchTime: insights.total_video_avg_time_watched || 0,
            };
            this.logger.log('Facebook insights fetched', {
                videoId: postId,
                views: analytics.views,
                likes: analytics.likes,
            });
            return analytics;
        }
        catch (error) {
            this.logger.error('Failed to fetch Facebook insights:', {
                videoId: postId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch Facebook insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getPageInsights(account, period = 'day') {
        try {
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/${account.accountId}/insights`, {
                params: {
                    metric: [
                        'page_views_total',
                        'page_fans',
                        'page_impressions',
                        'page_video_views',
                        'page_post_engagements',
                    ].join(','),
                    period,
                    access_token: account.accessToken,
                },
            });
            const insights = response.data.data.reduce((acc, metric) => {
                acc[metric.name] = metric.values[0]?.value || 0;
                return acc;
            }, {});
            this.logger.log('Facebook page insights fetched', {
                pageId: account.accountId,
            });
            return insights;
        }
        catch (error) {
            this.logger.error('Failed to fetch Facebook page insights:', {
                pageId: account.accountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch page insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getVideoDetails(account, videoId) {
        try {
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/${videoId}`, {
                params: {
                    fields: 'id,title,description,created_time,length,permalink_url,picture',
                    access_token: account.accessToken,
                },
            });
            this.logger.log('Facebook video details fetched', { videoId });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to fetch Facebook video details:', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch video details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateVideo(account, videoId, updates) {
        try {
            await axios_1.default.post(`${FACEBOOK_API_BASE}/${videoId}`, {
                ...updates,
                access_token: account.accessToken,
            });
            this.logger.log('Facebook video updated', { videoId, updates });
        }
        catch (error) {
            this.logger.error('Failed to update Facebook video:', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteVideo(account, videoId) {
        try {
            await axios_1.default.delete(`${FACEBOOK_API_BASE}/${videoId}`, {
                params: {
                    access_token: account.accessToken,
                },
            });
            this.logger.log('Facebook video deleted', { videoId });
        }
        catch (error) {
            this.logger.error('Failed to delete Facebook video:', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    isValidFacebookVideoId(videoId) {
        return /^\d+$/.test(videoId);
    }
    extractFacebookVideoId(url) {
        const patterns = [
            /facebook\.com\/.*\/videos\/(\d+)/,
            /facebook\.com\/watch\/\?v=(\d+)/,
            /fb\.watch\/([a-zA-Z0-9_-]+)/,
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
exports.FacebookService = FacebookService;
exports.FacebookService = FacebookService = FacebookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        facebook_oauth_service_1.FacebookOAuthService])
], FacebookService);
//# sourceMappingURL=facebook.service.js.map