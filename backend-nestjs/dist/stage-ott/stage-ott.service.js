"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StageOttService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageOttService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let StageOttService = StageOttService_1 = class StageOttService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(StageOttService_1.name);
        this.baseUrl =
            this.configService.get('STAGE_OTT_API_URL') ||
                'https://stageapi.stage.in/nest/cms';
        this.authToken = this.configService.get('STAGE_OTT_TOKEN') || '';
    }
    getHeaders(dialect) {
        return {
            Authorization: `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            lang: 'en',
            os: 'other',
            platform: 'web',
            ...(dialect ? { dialect } : {}),
        };
    }
    async listContent(options) {
        const { page = 1, perPage = 20, sortBy = 'createdAt', sortOrder = 'desc', dialect, } = options;
        const params = {
            page,
            perPage,
            sortBy,
            sortOrder,
        };
        if (dialect)
            params.dialect = dialect;
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/content/all`, {
                headers: this.getHeaders(dialect),
                params,
            });
            const data = response.data;
            data.items = data.items.map((item) => ({
                ...item,
                thumbnailURL: this.cleanS3Url(item.thumbnailURL) || item.thumbnailURL,
            }));
            return data;
        }
        catch (error) {
            this.logger.error(`Failed to fetch Stage OTT content: ${error.message}`);
            throw new common_1.BadRequestException(`Failed to fetch Stage OTT content: ${error.response?.data?.message || error.message}`);
        }
    }
    async importContent(userId, stageContent) {
        const { oldContentId, title, description, thumbnailURL, dialect, duration, slug, contentType, format } = stageContent;
        if (!oldContentId || !title) {
            throw new common_1.BadRequestException('Content ID and title are required');
        }
        const existing = await this.prisma.video.findFirst({
            where: {
                userId,
                stageOttId: String(oldContentId),
            },
        });
        if (existing) {
            return {
                message: 'Content already imported from Stage OTT',
                video: existing,
                alreadyExists: true,
            };
        }
        const dialectToLanguage = {
            hin: 'HINDI',
            har: 'HARYANVI',
            raj: 'RAJASTHANI',
            bho: 'BHOJPURI',
            guj: 'HINGLISH',
            eng: 'ENGLISH',
        };
        const cleanThumbnail = this.cleanS3Url(thumbnailURL);
        const video = await this.prisma.video.create({
            data: {
                userId,
                title: title.trim(),
                description: description || null,
                sourceType: 'STAGE_OTT',
                status: 'READY',
                thumbnailUrl: cleanThumbnail,
                duration: duration ? Math.round(duration) : null,
                language: dialectToLanguage[dialect || ''] || 'HINGLISH',
                stageOttId: String(oldContentId),
                stageOttData: {
                    oldContentId,
                    slug,
                    contentType,
                    dialect,
                    format,
                    thumbnailURL,
                    importedAt: new Date().toISOString(),
                },
            },
        });
        this.logger.log(`Stage OTT content imported: ${video.id} (${title}, contentId: ${oldContentId})`);
        return {
            message: 'Content imported from Stage OTT',
            video,
            alreadyExists: false,
        };
    }
    cleanS3Url(url) {
        if (!url)
            return null;
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes('s3.') && parsed.hostname.includes('amazonaws.com')) {
                return `${parsed.origin}${parsed.pathname}`;
            }
            return url;
        }
        catch {
            return url;
        }
    }
    async importMultiple(userId, items) {
        if (!items.length) {
            throw new common_1.BadRequestException('No items to import');
        }
        if (items.length > 20) {
            throw new common_1.BadRequestException('Maximum 20 items can be imported at once');
        }
        const results = [];
        for (const item of items) {
            try {
                const result = await this.importContent(userId, item);
                results.push({
                    success: true,
                    contentId: item.oldContentId,
                    videoId: result.video.id,
                    title: item.title,
                    alreadyExists: result.alreadyExists,
                });
            }
            catch (error) {
                results.push({
                    success: false,
                    contentId: item.oldContentId,
                    title: item.title,
                    error: error.message,
                });
            }
        }
        const successCount = results.filter((r) => r.success).length;
        return {
            message: `Imported ${successCount} of ${items.length} items from Stage OTT`,
            results,
        };
    }
};
exports.StageOttService = StageOttService;
exports.StageOttService = StageOttService = StageOttService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], StageOttService);
//# sourceMappingURL=stage-ott.service.js.map