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
var InstagramOAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../prisma/prisma.service");
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';
let InstagramOAuthService = InstagramOAuthService_1 = class InstagramOAuthService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(InstagramOAuthService_1.name);
    }
    getAuthUrl(state) {
        const scopes = [
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement',
            'business_management',
        ];
        const clientId = this.configService.get('INSTAGRAM_APP_ID') ||
            this.configService.get('FACEBOOK_APP_ID', '');
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: this.configService.get('INSTAGRAM_REDIRECT_URI', ''),
            scope: scopes.join(','),
            response_type: 'code',
            state: state || '',
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }
    async exchangeCode(code) {
        try {
            const clientId = this.configService.get('INSTAGRAM_APP_ID') ||
                this.configService.get('FACEBOOK_APP_ID', '');
            const clientSecret = this.configService.get('INSTAGRAM_APP_SECRET') ||
                this.configService.get('FACEBOOK_APP_SECRET', '');
            const params = new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: this.configService.get('INSTAGRAM_REDIRECT_URI', ''),
                code,
            });
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
                params,
            });
            const { access_token } = response.data;
            this.logger.log('Instagram access token obtained');
            return {
                accessToken: access_token,
            };
        }
        catch (error) {
            this.logger.error('Failed to exchange Instagram authorization code:', error);
            throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async exchangeForLongLivedToken(shortLivedToken) {
        try {
            const clientId = this.configService.get('INSTAGRAM_APP_ID') ||
                this.configService.get('FACEBOOK_APP_ID', '');
            const clientSecret = this.configService.get('INSTAGRAM_APP_SECRET') ||
                this.configService.get('FACEBOOK_APP_SECRET', '');
            const params = new URLSearchParams({
                grant_type: 'fb_exchange_token',
                client_id: clientId,
                client_secret: clientSecret,
                fb_exchange_token: shortLivedToken,
            });
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
                params,
            });
            const { access_token, expires_in } = response.data;
            this.logger.log('Long-lived Instagram token obtained', {
                expiresIn: expires_in,
            });
            return {
                accessToken: access_token,
                expiryDate: new Date(Date.now() + expires_in * 1000),
            };
        }
        catch (error) {
            this.logger.error('Failed to exchange for long-lived token:', error);
            throw new Error(`Failed to exchange for long-lived token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getAccounts(accessToken) {
        try {
            const pagesResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/me/accounts`, {
                params: {
                    access_token: accessToken,
                },
            });
            const pages = pagesResponse.data.data;
            const instagramAccounts = [];
            for (const page of pages) {
                try {
                    const igResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${page.id}`, {
                        params: {
                            fields: 'instagram_business_account',
                            access_token: page.access_token,
                        },
                    });
                    if (igResponse.data.instagram_business_account) {
                        const igAccountId = igResponse.data.instagram_business_account.id;
                        const igDetailsResponse = await axios_1.default.get(`${FACEBOOK_API_BASE}/${igAccountId}`, {
                            params: {
                                fields: 'id,username,profile_picture_url,followers_count,media_count',
                                access_token: page.access_token,
                            },
                        });
                        instagramAccounts.push({
                            id: igAccountId,
                            username: igDetailsResponse.data.username,
                            profilePicture: igDetailsResponse.data.profile_picture_url,
                            followersCount: igDetailsResponse.data.followers_count,
                            mediaCount: igDetailsResponse.data.media_count,
                            pageId: page.id,
                            pageName: page.name,
                            pageAccessToken: page.access_token,
                        });
                    }
                }
                catch (error) {
                    this.logger.debug(`Page ${page.id} does not have Instagram account`);
                }
            }
            this.logger.log('Instagram accounts fetched', {
                count: instagramAccounts.length,
            });
            return instagramAccounts;
        }
        catch (error) {
            this.logger.error('Failed to fetch Instagram accounts:', error);
            throw new Error(`Failed to fetch accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getValidAccessToken(accountId) {
        const account = await this.prisma.socialAccount.findUnique({
            where: { id: accountId },
        });
        if (!account) {
            throw new Error(`Social account ${accountId} not found`);
        }
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        if (account.tokenExpiry && account.tokenExpiry < sevenDaysFromNow) {
            this.logger.log('Instagram token near expiry, refreshing...', { accountId });
            try {
                await this.refreshToken(accountId);
                const refreshed = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
                return refreshed.accessToken;
            }
            catch (err) {
                this.logger.warn('Token refresh failed, using existing token', { accountId });
            }
        }
        return account.accessToken;
    }
    async refreshToken(accountId) {
        const account = await this.prisma.socialAccount.findUnique({
            where: { id: accountId },
        });
        if (!account) {
            throw new Error(`Social account ${accountId} not found`);
        }
        try {
            const { accessToken, expiryDate } = await this.exchangeForLongLivedToken(account.accessToken);
            await this.prisma.socialAccount.update({
                where: { id: accountId },
                data: {
                    accessToken,
                    tokenExpiry: expiryDate,
                },
            });
            this.logger.log('Instagram token refreshed successfully', { accountId });
        }
        catch (error) {
            this.logger.error('Failed to refresh Instagram token:', error);
            await this.prisma.socialAccount.update({
                where: { id: accountId },
                data: { status: 'EXPIRED' },
            });
            throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};
exports.InstagramOAuthService = InstagramOAuthService;
exports.InstagramOAuthService = InstagramOAuthService = InstagramOAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], InstagramOAuthService);
//# sourceMappingURL=instagram-oauth.service.js.map