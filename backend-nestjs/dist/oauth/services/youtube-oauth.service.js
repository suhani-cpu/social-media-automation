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
var YouTubeOAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const prisma_service_1 = require("../../prisma/prisma.service");
let YouTubeOAuthService = YouTubeOAuthService_1 = class YouTubeOAuthService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(YouTubeOAuthService_1.name);
    }
    createOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(this.configService.get('YOUTUBE_CLIENT_ID'), this.configService.get('YOUTUBE_CLIENT_SECRET'), this.configService.get('YOUTUBE_REDIRECT_URI', 'http://localhost:3000/api/oauth/youtube/callback'));
    }
    getAuthUrl(state) {
        const client = this.createOAuth2Client();
        return client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/youtube.upload',
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.readonly',
            ],
            state: state || '',
            prompt: 'consent',
        });
    }
    async exchangeCode(code) {
        const client = this.createOAuth2Client();
        const { tokens } = await client.getToken(code);
        this.logger.log(`YouTube tokens obtained: access=${!!tokens.access_token}, refresh=${!!tokens.refresh_token}`);
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || null,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        };
    }
    async getAuthClient(accountId) {
        const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
        if (!account || account.platform !== 'YOUTUBE') {
            throw new Error(`YouTube account ${accountId} not found`);
        }
        const client = this.createOAuth2Client();
        client.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken || undefined,
            expiry_date: account.tokenExpiry?.getTime(),
        });
        client.on('tokens', async (tokens) => {
            const updateData = {};
            if (tokens.access_token)
                updateData.accessToken = tokens.access_token;
            if (tokens.refresh_token)
                updateData.refreshToken = tokens.refresh_token;
            if (tokens.expiry_date)
                updateData.tokenExpiry = new Date(tokens.expiry_date);
            if (Object.keys(updateData).length > 0) {
                await this.prisma.socialAccount.update({ where: { id: accountId }, data: updateData });
                this.logger.log(`YouTube tokens refreshed for account ${accountId}`);
            }
        });
        return client;
    }
    async refreshToken(accountId) {
        const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
        if (!account?.refreshToken)
            throw new Error('No refresh token available');
        const client = this.createOAuth2Client();
        client.setCredentials({ refresh_token: account.refreshToken });
        try {
            const { credentials } = await client.refreshAccessToken();
            await this.prisma.socialAccount.update({
                where: { id: accountId },
                data: {
                    accessToken: credentials.access_token,
                    tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                },
            });
            this.logger.log(`YouTube token refreshed for ${accountId}`);
        }
        catch (error) {
            await this.prisma.socialAccount.update({ where: { id: accountId }, data: { status: 'EXPIRED' } });
            throw error;
        }
    }
};
exports.YouTubeOAuthService = YouTubeOAuthService;
exports.YouTubeOAuthService = YouTubeOAuthService = YouTubeOAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], YouTubeOAuthService);
//# sourceMappingURL=youtube-oauth.service.js.map