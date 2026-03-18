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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OAuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const youtube_oauth_service_1 = require("./services/youtube-oauth.service");
const facebook_oauth_service_1 = require("./services/facebook-oauth.service");
const instagram_oauth_service_1 = require("./services/instagram-oauth.service");
let OAuthController = OAuthController_1 = class OAuthController {
    constructor(configService, prisma, youtubeOAuth, facebookOAuth, instagramOAuth) {
        this.configService = configService;
        this.prisma = prisma;
        this.youtubeOAuth = youtubeOAuth;
        this.facebookOAuth = facebookOAuth;
        this.instagramOAuth = instagramOAuth;
        this.logger = new common_1.Logger(OAuthController_1.name);
    }
    getYouTubeAuthUrl(req) {
        const userId = req.user.id;
        const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
        const authUrl = this.youtubeOAuth.getAuthUrl(state);
        this.logger.log(`YouTube auth URL generated for user ${userId}`);
        return {
            authUrl,
            message: 'Redirect user to this URL to authorize YouTube access',
        };
    }
    async youtubeCallback(code, state, error, res) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
        try {
            if (error) {
                this.logger.error('YouTube OAuth error', { error });
                return res.redirect(`${frontendUrl}/dashboard/accounts?error=youtube_auth_failed`);
            }
            if (!code) {
                throw new common_1.BadRequestException('Authorization code is required');
            }
            if (!state) {
                throw new common_1.BadRequestException('Invalid state parameter');
            }
            let stateData;
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            }
            catch {
                throw new common_1.BadRequestException('Invalid state parameter');
            }
            const { userId, timestamp } = stateData;
            if (Date.now() - timestamp > 10 * 60 * 1000) {
                throw new common_1.BadRequestException('Authorization request expired');
            }
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            this.logger.log(`Exchanging YouTube authorization code for user ${userId}`);
            const tokens = await this.youtubeOAuth.exchangeCode(code);
            let channelId = `yt-${userId}-${Date.now()}`;
            let channelTitle = user.email || 'YouTube Channel';
            let channelMeta = {};
            try {
                const oauth2Client = this.youtubeOAuth.createOAuth2Client();
                oauth2Client.setCredentials({
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken || undefined,
                });
                const youtube = googleapis_1.google.youtube({ version: 'v3', auth: oauth2Client });
                const channelResponse = await youtube.channels.list({
                    part: ['snippet', 'statistics'],
                    mine: true,
                });
                const channel = channelResponse.data.items?.[0];
                if (channel?.id) {
                    channelId = channel.id;
                    channelTitle = channel.snippet?.title || channelTitle;
                    channelMeta = {
                        channelTitle,
                        subscriberCount: channel.statistics?.subscriberCount,
                        videoCount: channel.statistics?.videoCount,
                    };
                }
            }
            catch (apiErr) {
                this.logger.warn(`Could not fetch YouTube channel details (API may not be enabled): ${apiErr.message}`);
            }
            const existingAccount = await this.prisma.socialAccount.findFirst({
                where: { userId, platform: 'YOUTUBE' },
            });
            if (existingAccount) {
                await this.prisma.socialAccount.update({
                    where: { id: existingAccount.id },
                    data: {
                        accountId: channelId,
                        username: channelTitle,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        tokenExpiry: tokens.expiryDate,
                        status: 'ACTIVE',
                        metadata: channelMeta,
                    },
                });
                this.logger.log(`YouTube account updated for user ${userId}`);
            }
            else {
                await this.prisma.socialAccount.create({
                    data: {
                        userId,
                        platform: 'YOUTUBE',
                        accountId: channelId,
                        username: channelTitle,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        tokenExpiry: tokens.expiryDate,
                        status: 'ACTIVE',
                        metadata: channelMeta,
                    },
                });
                this.logger.log(`YouTube account connected for user ${userId}`);
            }
            return res.redirect(`${frontendUrl}/dashboard/accounts?success=youtube_connected`);
        }
        catch (err) {
            this.logger.error('YouTube callback error:', err);
            return res.redirect(`${frontendUrl}/dashboard/accounts?error=youtube_connection_failed`);
        }
    }
    getFacebookAuthUrl(req) {
        const userId = req.user.id;
        const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
        const authUrl = this.facebookOAuth.getAuthUrl(state);
        this.logger.log(`Facebook auth URL generated for user ${userId}`);
        return {
            authUrl,
            message: 'Redirect user to this URL to authorize Facebook access',
        };
    }
    async facebookCallback(code, state, error, res) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
        try {
            if (error) {
                this.logger.error('Facebook OAuth error', { error });
                return res.redirect(`${frontendUrl}/dashboard/accounts?error=facebook_auth_failed`);
            }
            if (!code) {
                throw new common_1.BadRequestException('Authorization code is required');
            }
            if (!state) {
                throw new common_1.BadRequestException('Invalid state parameter');
            }
            let stateData;
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            }
            catch {
                throw new common_1.BadRequestException('Invalid state parameter');
            }
            const { userId, timestamp } = stateData;
            if (Date.now() - timestamp > 10 * 60 * 1000) {
                throw new common_1.BadRequestException('Authorization request expired');
            }
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            this.logger.log(`Exchanging Facebook authorization code for user ${userId}`);
            const { accessToken: shortLivedToken } = await this.facebookOAuth.exchangeCode(code);
            const { accessToken, expiryDate } = await this.facebookOAuth.exchangeForLongLivedToken(shortLivedToken);
            const pages = await this.facebookOAuth.getPages(accessToken);
            if (pages.length === 0) {
                this.logger.warn(`No Facebook pages found for user ${userId}`);
                return res.redirect(`${frontendUrl}/dashboard/accounts?error=no_facebook_pages`);
            }
            let connectedCount = 0;
            for (const page of pages) {
                const existingAccount = await this.prisma.socialAccount.findFirst({
                    where: { userId, platform: 'FACEBOOK', accountId: page.id },
                });
                if (existingAccount) {
                    await this.prisma.socialAccount.update({
                        where: { id: existingAccount.id },
                        data: {
                            accessToken: page.accessToken,
                            tokenExpiry: expiryDate,
                            status: 'ACTIVE',
                            metadata: {
                                pageName: page.name,
                                category: page.category,
                            },
                        },
                    });
                }
                else {
                    await this.prisma.socialAccount.create({
                        data: {
                            userId,
                            platform: 'FACEBOOK',
                            accountId: page.id,
                            username: page.name,
                            accessToken: page.accessToken,
                            tokenExpiry: expiryDate,
                            status: 'ACTIVE',
                            metadata: {
                                pageName: page.name,
                                category: page.category,
                            },
                        },
                    });
                }
                connectedCount++;
            }
            this.logger.log(`Facebook pages connected for user ${userId}, count: ${connectedCount}`);
            return res.redirect(`${frontendUrl}/dashboard/accounts?success=facebook_connected&pages=${connectedCount}`);
        }
        catch (err) {
            this.logger.error('Facebook callback error:', err);
            return res.redirect(`${frontendUrl}/dashboard/accounts?error=facebook_connection_failed`);
        }
    }
    getInstagramAuthUrl(req) {
        const userId = req.user.id;
        const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
        const authUrl = this.instagramOAuth.getAuthUrl(state);
        this.logger.log(`Instagram auth URL generated for user ${userId}`);
        return {
            authUrl,
            message: 'Redirect user to this URL to authorize Instagram access',
        };
    }
    async instagramCallback(code, state, error, res) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3001');
        try {
            if (error) {
                this.logger.error('Instagram OAuth error', { error });
                return res.redirect(`${frontendUrl}/dashboard/accounts?error=instagram_auth_failed`);
            }
            if (!code) {
                throw new common_1.BadRequestException('Authorization code is required');
            }
            if (!state) {
                throw new common_1.BadRequestException('Invalid state parameter');
            }
            let stateData;
            try {
                stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            }
            catch {
                throw new common_1.BadRequestException('Invalid state parameter');
            }
            const { userId, timestamp } = stateData;
            if (Date.now() - timestamp > 10 * 60 * 1000) {
                throw new common_1.BadRequestException('Authorization request expired');
            }
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            this.logger.log(`Exchanging Instagram authorization code for user ${userId}`);
            const { accessToken: shortLivedToken } = await this.instagramOAuth.exchangeCode(code);
            const { accessToken, expiryDate } = await this.instagramOAuth.exchangeForLongLivedToken(shortLivedToken);
            const instagramAccounts = await this.instagramOAuth.getAccounts(accessToken);
            if (instagramAccounts.length === 0) {
                this.logger.warn(`No Instagram Business accounts found for user ${userId}`);
                return res.redirect(`${frontendUrl}/dashboard/accounts?error=no_instagram_accounts`);
            }
            let connectedCount = 0;
            for (const igAccount of instagramAccounts) {
                const existingAccount = await this.prisma.socialAccount.findFirst({
                    where: { userId, platform: 'INSTAGRAM', accountId: igAccount.id },
                });
                if (existingAccount) {
                    await this.prisma.socialAccount.update({
                        where: { id: existingAccount.id },
                        data: {
                            accessToken: igAccount.pageAccessToken,
                            tokenExpiry: expiryDate,
                            status: 'ACTIVE',
                            metadata: {
                                username: igAccount.username,
                                profilePicture: igAccount.profilePicture,
                                followersCount: igAccount.followersCount,
                                mediaCount: igAccount.mediaCount,
                                pageId: igAccount.pageId,
                                pageName: igAccount.pageName,
                            },
                        },
                    });
                }
                else {
                    await this.prisma.socialAccount.create({
                        data: {
                            userId,
                            platform: 'INSTAGRAM',
                            accountId: igAccount.id,
                            username: igAccount.username,
                            accessToken: igAccount.pageAccessToken,
                            tokenExpiry: expiryDate,
                            status: 'ACTIVE',
                            metadata: {
                                username: igAccount.username,
                                profilePicture: igAccount.profilePicture,
                                followersCount: igAccount.followersCount,
                                mediaCount: igAccount.mediaCount,
                                pageId: igAccount.pageId,
                                pageName: igAccount.pageName,
                            },
                        },
                    });
                }
                connectedCount++;
            }
            this.logger.log(`Instagram accounts connected for user ${userId}, count: ${connectedCount}`);
            return res.redirect(`${frontendUrl}/dashboard/accounts?success=instagram_connected&accounts=${connectedCount}`);
        }
        catch (err) {
            this.logger.error('Instagram callback error:', err);
            return res.redirect(`${frontendUrl}/dashboard/accounts?error=instagram_connection_failed`);
        }
    }
};
exports.OAuthController = OAuthController;
__decorate([
    (0, common_1.Get)('youtube/authorize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "getYouTubeAuthUrl", null);
__decorate([
    (0, common_1.Get)('youtube/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "youtubeCallback", null);
__decorate([
    (0, common_1.Get)('facebook/authorize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "getFacebookAuthUrl", null);
__decorate([
    (0, common_1.Get)('facebook/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "facebookCallback", null);
__decorate([
    (0, common_1.Get)('instagram/authorize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "getInstagramAuthUrl", null);
__decorate([
    (0, common_1.Get)('instagram/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "instagramCallback", null);
exports.OAuthController = OAuthController = OAuthController_1 = __decorate([
    (0, common_1.Controller)('oauth'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        youtube_oauth_service_1.YouTubeOAuthService,
        facebook_oauth_service_1.FacebookOAuthService,
        instagram_oauth_service_1.InstagramOAuthService])
], OAuthController);
//# sourceMappingURL=oauth.controller.js.map