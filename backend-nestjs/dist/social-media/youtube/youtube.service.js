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
var YouTubeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_service_1 = require("../../storage/storage.service");
const youtube_oauth_service_1 = require("../../oauth/services/youtube-oauth.service");
const ffmpeg_service_1 = require("../../video-processing/ffmpeg.service");
let YouTubeService = YouTubeService_1 = class YouTubeService {
    constructor(configService, prisma, storageService, youtubeOAuth, ffmpegService) {
        this.configService = configService;
        this.prisma = prisma;
        this.storageService = storageService;
        this.youtubeOAuth = youtubeOAuth;
        this.ffmpegService = ffmpegService;
        this.logger = new common_1.Logger(YouTubeService_1.name);
    }
    async publishToYouTube(post, video, account, onProgress) {
        this.logger.log('Publishing to YouTube', {
            postId: post.id,
            videoId: video.id,
            accountId: account.id,
            postType: post.postType,
        });
        try {
            let videoUrl = null;
            let isShort = false;
            if (post.postType === 'SHORT') {
                videoUrl = video.youtubeShortsUrl;
                isShort = true;
            }
            else if (post.postType === 'FEED') {
                videoUrl = video.youtubeSquareUrl;
            }
            else {
                videoUrl = video.youtubeVideoUrl;
            }
            if (!videoUrl) {
                videoUrl = video.rawVideoUrl;
                this.logger.warn(`No processed ${post.postType} URL found, falling back to rawVideoUrl`);
            }
            if (!videoUrl) {
                throw new Error(`No video file available for YouTube upload. Video status: ${video.status}`);
            }
            let description = post.caption;
            if (post.hashtags && post.hashtags.length > 0) {
                description += '\n\n' + post.hashtags.join(' ');
            }
            const tags = post.hashtags.map((tag) => tag.replace('#', '').trim());
            const metadata = post.metadata;
            const privacyStatus = (metadata?.privacyStatus || 'public');
            const uploadOptions = {
                videoPath: videoUrl,
                title: video.title || post.caption.substring(0, 100),
                description,
                tags,
                language: this.mapLanguageToYouTubeCode(post.language),
                privacyStatus,
                isShort,
                madeForKids: false,
            };
            const result = await this.uploadVideo(uploadOptions.videoPath, uploadOptions, account, onProgress);
            onProgress?.({ stage: 'done', percent: 100, message: 'Published successfully' });
            this.logger.log('Successfully published to YouTube', {
                postId: post.id,
                videoId: result.id,
                url: result.url,
                isShort,
                privacyStatus,
            });
            return {
                id: result.id,
                url: result.url,
            };
        }
        catch (error) {
            onProgress?.({ stage: 'error', percent: 0, message: error instanceof Error ? error.message : 'Upload failed' });
            this.logger.error('Failed to publish to YouTube:', {
                postId: post.id,
                videoId: video.id,
                accountId: account.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async uploadVideo(filePath, metadata, account, onProgress) {
        const { title, description, tags = [], categoryId = '22', language = 'en', privacyStatus = 'public', isShort = false, madeForKids = false, } = metadata;
        let localVideoPath = filePath;
        let tempFile = null;
        let convertedFile = null;
        try {
            if (filePath.startsWith('http')) {
                const ext = path.extname(filePath) || '.mp4';
                tempFile = path.join(os.tmpdir(), `youtube-download-${Date.now()}${ext}`);
                onProgress?.({ stage: 'downloading', percent: 0, message: 'Downloading video from storage...' });
                this.logger.log('Downloading video from storage for YouTube upload', {
                    videoPath: filePath,
                    tempFile,
                });
                await this.storageService.download(filePath, tempFile);
                localVideoPath = tempFile;
                onProgress?.({ stage: 'downloading', percent: 100, message: 'Download complete' });
            }
            if (!fs.existsSync(localVideoPath)) {
                throw new Error(`Video file not found: ${localVideoPath}`);
            }
            const fileExt = path.extname(localVideoPath).toLowerCase();
            const youtubeNativeFormats = ['.mp4', '.mov', '.avi', '.wmv', '.webm', '.flv', '.3gp', '.mpg', '.mpeg'];
            if (fileExt && !youtubeNativeFormats.includes(fileExt)) {
                onProgress?.({ stage: 'converting', percent: 0, message: `Converting ${fileExt} to MP4...` });
                this.logger.log('Converting video to MP4 for YouTube upload', { fileExt, localVideoPath });
                convertedFile = path.join(os.tmpdir(), `youtube-converted-${Date.now()}.mp4`);
                await this.convertToMp4(localVideoPath, convertedFile, (percent) => {
                    onProgress?.({ stage: 'converting', percent, message: `Converting: ${Math.round(percent)}%` });
                });
                localVideoPath = convertedFile;
                onProgress?.({ stage: 'converting', percent: 100, message: 'Conversion complete' });
            }
            const stats = fs.statSync(localVideoPath);
            const totalBytes = stats.size;
            onProgress?.({ stage: 'uploading', percent: 0, message: 'Starting YouTube upload...' });
            this.logger.log('Uploading video to YouTube', {
                accountId: account.id,
                title,
                fileSize: totalBytes,
                isShort,
                privacyStatus,
            });
            const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
            const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
            let videoTitle = title;
            if (isShort && !title.toLowerCase().includes('#shorts')) {
                videoTitle = `#Shorts ${title}`;
            }
            const requestBody = {
                snippet: {
                    title: videoTitle.substring(0, 100),
                    description: description.substring(0, 5000),
                    tags: tags.slice(0, 500),
                    categoryId,
                    defaultLanguage: language,
                },
                status: {
                    privacyStatus,
                    selfDeclaredMadeForKids: madeForKids,
                },
            };
            this.logger.log('YouTube upload request prepared', {
                title: videoTitle,
                tags: tags.length,
                categoryId,
                privacyStatus,
            });
            const readStream = fs.createReadStream(localVideoPath);
            let bytesRead = 0;
            readStream.on('data', (chunk) => {
                bytesRead += chunk.length;
                const percent = totalBytes > 0 ? (bytesRead / totalBytes) * 100 : 0;
                onProgress?.({ stage: 'uploading', percent, message: `Uploading: ${Math.round(percent)}%` });
            });
            const UPLOAD_TIMEOUT = parseInt(process.env.UPLOAD_TIMEOUT_MS || '50000', 10);
            const uploadPromise = youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody,
                media: {
                    body: readStream,
                },
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => {
                readStream.destroy();
                reject(new Error(`YouTube upload timed out after ${Math.round(UPLOAD_TIMEOUT / 1000)}s. Video may be too large for serverless deployment. Try a smaller/shorter video.`));
            }, UPLOAD_TIMEOUT));
            const response = await Promise.race([uploadPromise, timeoutPromise]);
            const videoId = response.data.id;
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            this.logger.log('Video uploaded to YouTube successfully', {
                videoId,
                url: videoUrl,
                title: response.data.snippet?.title,
            });
            return {
                id: videoId,
                url: videoUrl,
                title: response.data.snippet?.title || videoTitle,
                description: response.data.snippet?.description || description,
                publishedAt: response.data.snippet?.publishedAt || new Date().toISOString(),
            };
        }
        catch (error) {
            this.logger.error('YouTube upload failed:', {
                accountId: account.id,
                title,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw new Error(`YouTube upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    async convertToMp4(inputPath, outputPath, onProgress) {
        const ffmpeg = require('fluent-ffmpeg');
        return new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
                .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-preset fast'])
                .format('mp4');
            command.on('progress', (progress) => {
                onProgress?.(progress.percent || 0);
            });
            command.on('end', () => {
                this.logger.log('MP4 conversion complete', { inputPath, outputPath });
                resolve();
            });
            command.on('error', (err) => {
                this.logger.error('MP4 conversion failed', { error: err.message });
                reject(new Error(`MP4 conversion failed: ${err.message}`));
            });
            command.save(outputPath);
        });
    }
    async fetchAnalytics(account, videoId) {
        this.logger.log('Fetching YouTube insights', {
            videoId,
            accountId: account.id,
        });
        try {
            const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
            const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
            const response = await youtube.videos.list({
                part: ['statistics', 'contentDetails'],
                id: [videoId],
            });
            if (!response.data.items || response.data.items.length === 0) {
                throw new Error(`Video ${videoId} not found`);
            }
            const videoData = response.data.items[0];
            const stats = videoData.statistics;
            const contentDetails = videoData.contentDetails;
            const analytics = {
                views: parseInt(stats?.viewCount || '0'),
                likes: parseInt(stats?.likeCount || '0'),
                dislikes: parseInt(stats?.dislikeCount || '0'),
                comments: parseInt(stats?.commentCount || '0'),
                shares: 0,
                favorites: parseInt(stats?.favoriteCount || '0'),
                duration: contentDetails?.duration ?? undefined,
            };
            this.logger.log('YouTube analytics fetched', {
                videoId,
                views: analytics.views,
                likes: analytics.likes,
            });
            return analytics;
        }
        catch (error) {
            this.logger.error('Failed to fetch YouTube analytics:', {
                videoId,
                accountId: account.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch YouTube analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async fetchDetailedAnalytics(account, videoId, startDate, endDate) {
        try {
            const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
            const youtubeAnalytics = googleapis_1.google.youtubeAnalytics({
                version: 'v2',
                auth: oauth2Client,
            });
            const response = await youtubeAnalytics.reports.query({
                ids: 'channel==MINE',
                startDate,
                endDate,
                metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
                dimensions: 'video',
                filters: `video==${videoId}`,
            });
            this.logger.log('YouTube detailed analytics fetched', {
                videoId,
                rows: response.data.rows?.length || 0,
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to fetch YouTube detailed analytics:', {
                videoId,
                accountId: account.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    async getChannelInfo(account) {
        try {
            const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
            const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
            const response = await youtube.channels.list({
                part: ['snippet', 'statistics', 'contentDetails'],
                mine: true,
            });
            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('No channel found for this account');
            }
            const channel = response.data.items[0];
            this.logger.log('YouTube channel info fetched', {
                accountId: account.id,
                channelId: channel.id,
                title: channel.snippet?.title,
            });
            return {
                id: channel.id,
                title: channel.snippet?.title,
                description: channel.snippet?.description,
                customUrl: channel.snippet?.customUrl,
                subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
                videoCount: parseInt(channel.statistics?.videoCount || '0'),
                viewCount: parseInt(channel.statistics?.viewCount || '0'),
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch YouTube channel info:', {
                accountId: account.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to fetch channel info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateVideo(account, videoId, updates) {
        try {
            const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
            const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
            const requestBody = { id: videoId };
            if (updates.title ||
                updates.description ||
                updates.tags ||
                updates.categoryId) {
                requestBody.snippet = {};
                if (updates.title)
                    requestBody.snippet.title = updates.title.substring(0, 100);
                if (updates.description)
                    requestBody.snippet.description = updates.description.substring(0, 5000);
                if (updates.tags)
                    requestBody.snippet.tags = updates.tags.slice(0, 500);
                if (updates.categoryId)
                    requestBody.snippet.categoryId = updates.categoryId;
            }
            if (updates.privacyStatus) {
                requestBody.status = {
                    privacyStatus: updates.privacyStatus,
                };
            }
            await youtube.videos.update({
                part: Object.keys(requestBody).filter((k) => k !== 'id'),
                requestBody,
            });
            this.logger.log('YouTube video updated', { videoId, updates });
        }
        catch (error) {
            this.logger.error('Failed to update YouTube video:', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to update video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteVideo(account, videoId) {
        try {
            const oauth2Client = await this.youtubeOAuth.getAuthClient(account.id);
            const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
            await youtube.videos.delete({ id: videoId });
            this.logger.log('YouTube video deleted', { videoId });
        }
        catch (error) {
            this.logger.error('Failed to delete YouTube video:', {
                videoId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    mapLanguageToYouTubeCode(language) {
        const languageMap = {
            ENGLISH: 'en',
            HINDI: 'hi',
            HINGLISH: 'en',
            HARYANVI: 'hi',
            RAJASTHANI: 'hi',
            BHOJPURI: 'hi',
        };
        return languageMap[language] || 'en';
    }
    isValidYouTubeVideoId(videoId) {
        return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    }
    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
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
exports.YouTubeService = YouTubeService;
exports.YouTubeService = YouTubeService = YouTubeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        youtube_oauth_service_1.YouTubeOAuthService,
        ffmpeg_service_1.FfmpegService])
], YouTubeService);
//# sourceMappingURL=youtube.service.js.map