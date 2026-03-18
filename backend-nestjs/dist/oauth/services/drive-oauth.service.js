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
var DriveOAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveOAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../../prisma/prisma.service");
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
];
let DriveOAuthService = DriveOAuthService_1 = class DriveOAuthService {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(DriveOAuthService_1.name);
        this.pendingStates = new Map();
    }
    createOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(this.configService.get('GOOGLE_DRIVE_CLIENT_ID'), this.configService.get('GOOGLE_DRIVE_CLIENT_SECRET'), this.configService.get('GOOGLE_DRIVE_REDIRECT_URI'));
    }
    async getAuthUrl(userId) {
        const client = this.createOAuth2Client();
        const stateToken = crypto.randomBytes(32).toString('hex');
        this.pendingStates.set(stateToken, { userId, expires: Date.now() + 10 * 60 * 1000 });
        const authUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: stateToken,
            prompt: 'consent',
        });
        return authUrl;
    }
    resolveState(stateToken) {
        const entry = this.pendingStates.get(stateToken);
        if (!entry) {
            throw new Error('Invalid or expired OAuth state token');
        }
        if (Date.now() > entry.expires) {
            this.pendingStates.delete(stateToken);
            throw new Error('OAuth state token expired');
        }
        this.pendingStates.delete(stateToken);
        return entry.userId;
    }
    async handleCallback(code, userId) {
        const client = this.createOAuth2Client();
        try {
            this.logger.log(`Drive OAuth: exchanging code for tokens for user ${userId}`);
            const { tokens } = await client.getToken(code);
            this.logger.log(`Drive OAuth: tokens received, access_token: ${tokens.access_token ? 'YES' : 'NO'}, refresh_token: ${tokens.refresh_token ? 'YES' : 'NO'}`);
            client.setCredentials(tokens);
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: client });
            const { data: userInfo } = await oauth2.userinfo.get();
            this.logger.log(`Drive OAuth: user info received - email: ${userInfo.email}, id: ${userInfo.id}`);
            const account = await this.prisma.socialAccount.upsert({
                where: {
                    userId_platform_accountId: {
                        userId,
                        platform: 'GOOGLE_DRIVE',
                        accountId: userInfo.id || userInfo.email || 'drive-user',
                    },
                },
                update: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                    username: userInfo.email || 'drive-user',
                    status: 'ACTIVE',
                },
                create: {
                    userId,
                    platform: 'GOOGLE_DRIVE',
                    accountId: userInfo.id || userInfo.email || 'drive-user',
                    username: userInfo.email || 'drive-user',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                    status: 'ACTIVE',
                },
            });
            this.logger.log(`Google Drive account connected for user ${userId}`);
            return account;
        }
        catch (error) {
            this.logger.error('Error in Google Drive OAuth callback:', error);
            throw error;
        }
    }
    async refreshAccessToken(accountId) {
        try {
            const account = await this.prisma.socialAccount.findUnique({
                where: { id: accountId },
            });
            if (!account || !account.refreshToken) {
                throw new Error('Account not found or no refresh token');
            }
            const client = this.createOAuth2Client();
            client.setCredentials({
                refresh_token: account.refreshToken,
            });
            const { credentials } = await client.refreshAccessToken();
            await this.prisma.socialAccount.update({
                where: { id: accountId },
                data: {
                    accessToken: credentials.access_token,
                    tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                },
            });
            this.logger.log(`Access token refreshed for Google Drive account ${accountId}`);
            return credentials.access_token;
        }
        catch (error) {
            this.logger.error('Error refreshing Google Drive token:', error);
            throw error;
        }
    }
    async getAuthenticatedClient(userId) {
        const account = await this.prisma.socialAccount.findFirst({
            where: {
                userId,
                platform: 'GOOGLE_DRIVE',
                status: 'ACTIVE',
            },
        });
        if (!account) {
            throw new Error('Google Drive account not connected');
        }
        const client = this.createOAuth2Client();
        if (account.tokenExpiry && account.tokenExpiry < new Date()) {
            await this.refreshAccessToken(account.id);
            const updatedAccount = await this.prisma.socialAccount.findUnique({
                where: { id: account.id },
            });
            if (updatedAccount) {
                client.setCredentials({
                    access_token: updatedAccount.accessToken,
                    refresh_token: updatedAccount.refreshToken || undefined,
                });
            }
        }
        else {
            client.setCredentials({
                access_token: account.accessToken,
                refresh_token: account.refreshToken || undefined,
            });
        }
        return client;
    }
    async disconnect(userId) {
        try {
            await this.prisma.socialAccount.updateMany({
                where: {
                    userId,
                    platform: 'GOOGLE_DRIVE',
                },
                data: {
                    status: 'DISCONNECTED',
                },
            });
            this.logger.log(`Google Drive disconnected for user ${userId}`);
        }
        catch (error) {
            this.logger.error('Error disconnecting Google Drive:', error);
            throw error;
        }
    }
};
exports.DriveOAuthService = DriveOAuthService;
exports.DriveOAuthService = DriveOAuthService = DriveOAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], DriveOAuthService);
//# sourceMappingURL=drive-oauth.service.js.map