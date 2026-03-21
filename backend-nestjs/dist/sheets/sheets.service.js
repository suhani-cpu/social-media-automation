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
var SheetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
let SheetsService = SheetsService_1 = class SheetsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SheetsService_1.name);
    }
    async importFromSheet(userId, sheetUrl) {
        if (!sheetUrl) {
            throw new common_1.BadRequestException('Sheet URL is required');
        }
        this.logger.log(`Starting sheet import for user ${userId}`);
        const sheetData = await this.fetchSheetData(sheetUrl);
        const parsedVideos = this.parseVideos(sheetData);
        this.logger.log(`Found ${parsedVideos.length} videos to import`);
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        for (const video of parsedVideos) {
            try {
                this.logger.log(`Processing video: ${video.title}`);
                let videoRecord = null;
                if (video.driveLinks.length > 0) {
                    for (const driveLink of video.driveLinks) {
                        const fileId = this.extractDriveFileId(driveLink);
                        if (fileId) {
                            try {
                                const driveAccount = await this.prisma.socialAccount.findFirst({
                                    where: {
                                        userId,
                                        platform: 'GOOGLE_DRIVE',
                                        status: 'ACTIVE',
                                    },
                                });
                                if (!driveAccount) {
                                    this.logger.warn('No active Google Drive account for user, skipping Drive link');
                                    continue;
                                }
                                const { google } = await Promise.resolve().then(() => __importStar(require('googleapis')));
                                const oauth2Client = new google.auth.OAuth2();
                                oauth2Client.setCredentials({
                                    access_token: driveAccount.accessToken,
                                    refresh_token: driveAccount.refreshToken || undefined,
                                });
                                const drive = google.drive({ version: 'v3', auth: oauth2Client });
                                const metaRes = await drive.files.get({
                                    fileId,
                                    fields: 'id, name, mimeType, size',
                                });
                                const fileMeta = metaRes.data;
                                if (fileMeta.mimeType &&
                                    fileMeta.mimeType.startsWith('video/')) {
                                    const tempDir = '/tmp/sheet-imports';
                                    await fs.mkdir(tempDir, { recursive: true });
                                    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileMeta.name}`);
                                    const fileRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
                                    const fsSync = await Promise.resolve().then(() => __importStar(require('fs')));
                                    const dest = fsSync.createWriteStream(tempFilePath);
                                    await new Promise((resolve, reject) => {
                                        fileRes.data
                                            .on('end', () => resolve())
                                            .on('error', (err) => reject(err))
                                            .pipe(dest);
                                    });
                                    const stats = await fs.stat(tempFilePath);
                                    videoRecord = await this.prisma.video.create({
                                        data: {
                                            userId,
                                            title: video.title,
                                            description: video.description,
                                            sourceType: 'MANUAL',
                                            status: 'READY',
                                            rawVideoUrl: tempFilePath,
                                            instagramReelUrl: tempFilePath,
                                            fileSize: BigInt(stats.size),
                                            metadata: {
                                                source: 'google_sheets',
                                                driveFileId: fileId,
                                                driveFileName: fileMeta.name,
                                                headlines: video.headlines,
                                                importedAt: new Date().toISOString(),
                                                sheetUrl,
                                            },
                                        },
                                    });
                                    this.logger.log(`Video imported from Drive: ${videoRecord.id}`);
                                    break;
                                }
                            }
                            catch (error) {
                                this.logger.error(`Error importing from Drive link ${driveLink}: ${error.message}`);
                            }
                        }
                    }
                }
                if (!videoRecord && video.youtubeLinks.vertical) {
                    videoRecord = await this.prisma.video.create({
                        data: {
                            userId,
                            title: video.title,
                            description: video.description,
                            sourceType: 'MANUAL',
                            status: 'READY',
                            sourceUrl: video.youtubeLinks.vertical,
                            instagramReelUrl: video.youtubeLinks.vertical,
                            metadata: {
                                source: 'google_sheets',
                                format: '9:16',
                                youtubeUrl: video.youtubeLinks.vertical,
                                headlines: video.headlines,
                                importedAt: new Date().toISOString(),
                                sheetUrl,
                                note: 'Vertical 9:16 format - YouTube Shorts link',
                            },
                        },
                    });
                    this.logger.log(`Video metadata imported from YouTube (9:16) - marked as READY: ${videoRecord.id}`);
                }
                if (videoRecord) {
                    let postCreated = false;
                    let postId = null;
                    let publishStatus = 'not_attempted';
                    try {
                        const instagramAccount = await this.prisma.socialAccount.findFirst({
                            where: {
                                userId,
                                platform: 'INSTAGRAM',
                                status: 'ACTIVE',
                            },
                        });
                        if (instagramAccount) {
                            const caption = video.description || video.title;
                            const post = await this.prisma.post.create({
                                data: {
                                    userId,
                                    videoId: videoRecord.id,
                                    accountId: instagramAccount.id,
                                    caption,
                                    language: 'HINGLISH',
                                    hashtags: [],
                                    mentions: [],
                                    platform: 'INSTAGRAM',
                                    postType: 'REEL',
                                    status: 'DRAFT',
                                    metadata: {
                                        autoCreated: true,
                                        fromSheet: true,
                                        sheetUrl,
                                        headlines: video.headlines,
                                    },
                                },
                            });
                            postId = post.id;
                            postCreated = true;
                            publishStatus = 'draft';
                        }
                    }
                    catch (postError) {
                        this.logger.error(`Error creating auto-post for video ${videoRecord.id}: ${postError.message}`);
                    }
                    successCount++;
                    results.push({
                        success: true,
                        title: video.title,
                        videoId: videoRecord.id,
                        source: videoRecord.metadata?.driveFileId
                            ? 'drive'
                            : 'youtube',
                        format: '9:16',
                        postCreated,
                        postId,
                        publishStatus,
                    });
                }
                else {
                    failedCount++;
                    results.push({
                        success: false,
                        title: video.title,
                        error: 'No 9:16 vertical video found (only importing Reels/Shorts format)',
                    });
                }
            }
            catch (error) {
                failedCount++;
                this.logger.error(`Error processing video ${video.title}: ${error.message}`);
                results.push({
                    success: false,
                    title: video.title,
                    error: error.message,
                });
            }
        }
        this.logger.log(`Sheet import completed: ${successCount} succeeded, ${failedCount} failed`);
        return {
            message: `Imported ${successCount} of ${parsedVideos.length} videos successfully`,
            summary: {
                total: parsedVideos.length,
                succeeded: successCount,
                failed: failedCount,
            },
            results,
        };
    }
    async previewSheet(sheetUrl) {
        if (!sheetUrl) {
            throw new common_1.BadRequestException('Sheet URL is required');
        }
        const sheetData = await this.fetchSheetData(sheetUrl);
        const parsedVideos = this.parseVideos(sheetData);
        const vertical9_16Videos = parsedVideos.filter((v) => v.youtubeLinks.vertical || v.driveLinks.length > 0);
        return {
            message: 'Sheet data fetched successfully (only 9:16 vertical format)',
            summary: {
                totalVideos: parsedVideos.length,
                vertical9_16Videos: vertical9_16Videos.length,
                videosWithDriveLinks: vertical9_16Videos.filter((v) => v.driveLinks.length > 0).length,
                skipped: parsedVideos.length - vertical9_16Videos.length,
            },
            videos: vertical9_16Videos.map((v) => ({
                title: v.title,
                description: v.description.substring(0, 100) + '...',
                driveLinksCount: v.driveLinks.length,
                has9_16: !!v.youtubeLinks.vertical,
            })),
        };
    }
    async fetchSheetData(sheetUrl) {
        const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!sheetIdMatch) {
            throw new common_1.BadRequestException('Invalid Google Sheets URL');
        }
        const sheetId = sheetIdMatch[1];
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        this.logger.log(`Fetching sheet data from: ${csvUrl}`);
        let response;
        try {
            response = await axios_1.default.get(csvUrl, {
                maxRedirects: 5,
                timeout: 30000,
            });
        }
        catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                throw new common_1.BadRequestException('Sheet is not publicly accessible. Please go to Google Sheets → Share → Change to "Anyone with the link"');
            }
            if (err.code === 'ECONNABORTED') {
                throw new common_1.BadRequestException('Sheet fetch timed out. Please try again.');
            }
            throw new common_1.BadRequestException(`Failed to fetch sheet: ${err.message}`);
        }
        const csvData = response.data;
        if (typeof csvData === 'string' && csvData.trim().startsWith('<!DOCTYPE')) {
            throw new common_1.BadRequestException('Sheet is not publicly accessible. Please go to Google Sheets → Share → Change to "Anyone with the link"');
        }
        const rows = this.parseCSV(csvData);
        this.logger.log(`Parsed ${rows.length} rows from sheet`);
        return rows;
    }
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
            throw new common_1.BadRequestException('Sheet has no data');
        }
        const dataRows = lines.slice(1);
        const videos = [];
        for (const line of dataRows) {
            const values = this.parseCSVLine(line);
            if (values.length < 2)
                continue;
            videos.push({
                creativeName: values[0] || '',
                description: values[1] || '',
                headlines: values[2] || '',
                metaStatic: values[3] || '',
                googleStatic: values[4] || '',
                videoWith1rsCTA: values[5] || '',
                videoWithWatchNow: values[6] || '',
                video16_9: values[7] || '',
                video1_1: values[8] || '',
                video9_16: values[9] || '',
            });
        }
        return videos;
    }
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }
    isYouTubeUrl(url) {
        if (!url)
            return false;
        return /youtube\.com|youtu\.be/i.test(url);
    }
    isDriveUrl(url) {
        if (!url)
            return false;
        return /drive\.google\.com|docs\.google\.com.*\/d\/|open\?id=/i.test(url);
    }
    parseVideos(sheetData) {
        return sheetData.map((row) => {
            const driveLinks = [];
            [
                row.metaStatic,
                row.googleStatic,
                row.videoWith1rsCTA,
                row.videoWithWatchNow,
                row.video16_9,
                row.video1_1,
                row.video9_16,
            ].forEach((link) => {
                if (link && this.isDriveUrl(link)) {
                    driveLinks.push(link);
                }
            });
            const youtubeLinks = {};
            if (row.video16_9 && this.isYouTubeUrl(row.video16_9)) {
                youtubeLinks.landscape = row.video16_9;
            }
            if (row.video1_1 && this.isYouTubeUrl(row.video1_1)) {
                youtubeLinks.square = row.video1_1;
            }
            if (row.video9_16 && this.isYouTubeUrl(row.video9_16)) {
                youtubeLinks.vertical = row.video9_16;
            }
            const caption = row.description || row.headlines || '';
            return {
                title: row.creativeName || 'Untitled Video',
                description: caption,
                headlines: row.headlines || '',
                driveLinks,
                youtubeLinks,
            };
        });
    }
    extractDriveFileId(driveUrl) {
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9-_]+)/,
            /[?&]id=([a-zA-Z0-9-_]+)/,
            /\/folders\/([a-zA-Z0-9-_]+)/,
            /\/d\/([a-zA-Z0-9-_]+)/,
            /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9-_]+)/,
        ];
        for (const pattern of patterns) {
            const match = driveUrl.match(pattern);
            if (match)
                return match[1];
        }
        return null;
    }
};
exports.SheetsService = SheetsService;
exports.SheetsService = SheetsService = SheetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SheetsService);
//# sourceMappingURL=sheets.service.js.map