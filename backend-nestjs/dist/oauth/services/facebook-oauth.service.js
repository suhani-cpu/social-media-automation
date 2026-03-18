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
var FacebookOAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../prisma/prisma.service");
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';
let FacebookOAuthService = FacebookOAuthService_1 = class FacebookOAuthService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(FacebookOAuthService_1.name);
    }
    getAuthUrl(state) {
        const scopes = [
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_show_list',
            'publish_video',
        ];
        const params = new URLSearchParams({
            client_id: this.configService.get('FACEBOOK_APP_ID', ''),
            redirect_uri: this.configService.get('FACEBOOK_REDIRECT_URI', ''),
            scope: scopes.join(','),
            response_type: 'code',
            state: state || '',
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }
    async exchangeCode(code) {
        try {
            const params = new URLSearchParams({
                client_id: this.configService.get('FACEBOOK_APP_ID', ''),
                client_secret: this.configService.get('FACEBOOK_APP_SECRET', ''),
                redirect_uri: this.configService.get('FACEBOOK_REDIRECT_URI', ''),
                code,
            });
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
                params,
            });
            const { access_token } = response.data;
            this.logger.log('Facebook access token obtained');
            return {
                accessToken: access_token,
            };
        }
        catch (error) {
            this.logger.error('Failed to exchange Facebook authorization code:', error);
            throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async exchangeForLongLivedToken(shortLivedToken) {
        try {
            const params = new URLSearchParams({
                grant_type: 'fb_exchange_token',
                client_id: this.configService.get('FACEBOOK_APP_ID', ''),
                client_secret: this.configService.get('FACEBOOK_APP_SECRET', ''),
                fb_exchange_token: shortLivedToken,
            });
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
                params,
            });
            const { access_token, expires_in } = response.data;
            this.logger.log('Long-lived Facebook token obtained', {
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
    async getPages(accessToken) {
        try {
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/me/accounts`, {
                params: {
                    access_token: accessToken,
                },
            });
            const pages = response.data.data;
            this.logger.log('Facebook pages fetched', {
                count: pages.length,
            });
            return pages.map((page) => ({
                id: page.id,
                name: page.name,
                accessToken: page.access_token,
                category: page.category,
            }));
        }
        catch (error) {
            this.logger.error('Failed to fetch Facebook pages:', error);
            throw new Error(`Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getPageAccessToken(userAccessToken, pageId) {
        try {
            const response = await axios_1.default.get(`${FACEBOOK_API_BASE}/${pageId}`, {
                params: {
                    fields: 'access_token',
                    access_token: userAccessToken,
                },
            });
            const pageAccessToken = response.data.access_token;
            this.logger.log('Page access token obtained', { pageId });
            return pageAccessToken;
        }
        catch (error) {
            this.logger.error('Failed to get page access token:', error);
            throw new Error(`Failed to get page access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            this.logger.log('Facebook token near expiry, refreshing...', { accountId });
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
            this.logger.log('Facebook token refreshed successfully', { accountId });
        }
        catch (error) {
            this.logger.error('Failed to refresh Facebook token:', error);
            await this.prisma.socialAccount.update({
                where: { id: accountId },
                data: { status: 'EXPIRED' },
            });
            throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};
exports.FacebookOAuthService = FacebookOAuthService;
exports.FacebookOAuthService = FacebookOAuthService = FacebookOAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], FacebookOAuthService);
//# sourceMappingURL=facebook-oauth.service.js.map