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
var DriveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const googleapis_1 = require("googleapis");
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
];
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
];
let DriveService = DriveService_1 = class DriveService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(DriveService_1.name);
        this.pendingStates = new Map();
    }
    getOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(this.configService.get('GOOGLE_DRIVE_CLIENT_ID'), this.configService.get('GOOGLE_DRIVE_CLIENT_SECRET'), this.configService.get('GOOGLE_DRIVE_REDIRECT_URI'));
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
            throw new common_1.NotFoundException('Google Drive account not connected');
        }
        const client = this.getOAuth2Client();
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
    async refreshAccessToken(accountId) {
        const account = await this.prisma.socialAccount.findUnique({
            where: { id: accountId },
        });
        if (!account || !account.refreshToken) {
            throw new common_1.BadRequestException('Account not found or no refresh token available');
        }
        const client = this.getOAuth2Client();
        client.setCredentials({ refresh_token: account.refreshToken });
        const { credentials } = await client.refreshAccessToken();
        await this.prisma.socialAccount.update({
            where: { id: accountId },
            data: {
                accessToken: credentials.access_token,
                tokenExpiry: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null,
            },
        });
        this.logger.log(`Access token refreshed for Google Drive account ${accountId}`);
        return credentials.access_token;
    }
    getDriveClient(auth) {
        return googleapis_1.google.drive({ version: 'v3', auth });
    }
    async startAuth(userId) {
        const client = this.getOAuth2Client();
        const stateToken = crypto.randomBytes(32).toString('hex');
        this.pendingStates.set(stateToken, {
            userId,
            expires: Date.now() + 10 * 60 * 1000,
        });
        const authUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: stateToken,
            prompt: 'consent',
        });
        return {
            message: 'Authorization URL generated',
            authUrl,
        };
    }
    async handleCallback(code, state) {
        const entry = this.pendingStates.get(state);
        if (!entry) {
            throw new common_1.BadRequestException('Invalid or expired OAuth state token');
        }
        if (Date.now() > entry.expires) {
            this.pendingStates.delete(state);
            throw new common_1.BadRequestException('OAuth state token expired');
        }
        this.pendingStates.delete(state);
        const userId = entry.userId;
        const client = this.getOAuth2Client();
        this.logger.log(`Drive OAuth: exchanging code for tokens for user ${userId}`);
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: client });
        const { data: userInfo } = await oauth2.userinfo.get();
        await this.prisma.socialAccount.upsert({
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
                tokenExpiry: tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : null,
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
                tokenExpiry: tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : null,
                status: 'ACTIVE',
            },
        });
        this.logger.log(`Google Drive account connected for user ${userId}`);
        const frontendUrl = this.configService.get('FRONTEND_URL');
        return `${frontendUrl}/dashboard/accounts?drive=connected`;
    }
    async getStatus(userId) {
        const account = await this.prisma.socialAccount.findFirst({
            where: {
                userId,
                platform: 'GOOGLE_DRIVE',
                status: 'ACTIVE',
            },
            select: {
                id: true,
                username: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            connected: !!account,
            account: account || null,
        };
    }
    async disconnect(userId) {
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
        return { message: 'Google Drive disconnected successfully' };
    }
    async listFolders(userId, parentId) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = this.getDriveClient(auth);
        const query = parentId
            ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`
            : `'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`;
        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, createdTime)',
            pageSize: 100,
            orderBy: 'name',
        });
        const folders = (response.data.files || []).map((folder) => ({
            id: folder.id,
            name: folder.name,
            createdTime: folder.createdTime || undefined,
        }));
        this.logger.log(`Listed ${folders.length} folders from Google Drive`);
        return { folders };
    }
    async listFiles(userId, folderId, videosOnly = true) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = this.getDriveClient(auth);
        let query = folderId
            ? `'${folderId}' in parents and trashed = false`
            : `'root' in parents and trashed = false`;
        if (videosOnly) {
            const mimeTypeQuery = VIDEO_MIME_TYPES.map((mt) => `mimeType='${mt}'`).join(' or ');
            query += ` and (${mimeTypeQuery})`;
        }
        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
            pageSize: 100,
            orderBy: 'modifiedTime desc',
        });
        const files = (response.data.files || []).map((file) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size ?? undefined,
            createdTime: file.createdTime || undefined,
            modifiedTime: file.modifiedTime || undefined,
            webViewLink: file.webViewLink || undefined,
            thumbnailLink: file.thumbnailLink || undefined,
            isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        }));
        this.logger.log(`Listed ${files.length} files from Google Drive folder ${folderId || 'root'}`);
        return { files };
    }
    async downloadFile(drive, fileId, destinationPath) {
        const fileMetadata = await drive.files.get({
            fileId,
            fields: 'name, mimeType, size',
        });
        this.logger.log(`Downloading file ${fileMetadata.data.name} (${fileMetadata.data.size} bytes) from Google Drive`);
        const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
        const dest = fsSync.createWriteStream(destinationPath);
        return new Promise((resolve, reject) => {
            response.data
                .on('end', () => {
                this.logger.log(`File downloaded successfully to ${destinationPath}`);
                resolve(destinationPath);
            })
                .on('error', (err) => {
                this.logger.error('Error downloading file:', err.message);
                reject(err);
            })
                .pipe(dest);
        });
    }
    async importVideo(userId, fileId, title) {
        if (!fileId) {
            throw new common_1.BadRequestException('File ID is required');
        }
        const auth = await this.getAuthenticatedClient(userId);
        const drive = this.getDriveClient(auth);
        const fileMetadata = await this.getFileMetadataFromDrive(drive, fileId);
        const existing = await this.prisma.video.findFirst({
            where: {
                userId,
                metadata: { path: ['driveFileId'], equals: fileId },
            },
        });
        if (existing) {
            return {
                message: 'Video already imported from Google Drive',
                video: existing,
            };
        }
        const video = await this.prisma.video.create({
            data: {
                userId,
                title: title || fileMetadata.name,
                sourceType: 'MANUAL',
                status: 'READY',
                fileSize: fileMetadata.size ? BigInt(fileMetadata.size) : BigInt(0),
                metadata: {
                    driveFileId: fileId,
                    driveFileName: fileMetadata.name,
                    driveMimeType: fileMetadata.mimeType,
                    importedAt: new Date().toISOString(),
                },
            },
        });
        this.logger.log(`Video imported from Google Drive: ${video.id} (${fileMetadata.name})`);
        return {
            message: 'Video imported from Google Drive',
            video,
        };
    }
    async downloadToTemp(userId, driveFileId, fileName) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = this.getDriveClient(auth);
        const tempDir = '/tmp/drive-imports';
        await fs.mkdir(tempDir, { recursive: true });
        const safeName = fileName || `drive-${driveFileId}`;
        const tempFilePath = path.join(tempDir, `${Date.now()}-${safeName}`);
        this.logger.log(`Downloading Drive file ${driveFileId} to ${tempFilePath}`);
        await this.downloadFile(drive, driveFileId, tempFilePath);
        this.logger.log(`Drive file downloaded: ${tempFilePath}`);
        return tempFilePath;
    }
    async importMultiple(userId, fileIds) {
        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            throw new common_1.BadRequestException('File IDs array is required');
        }
        if (fileIds.length > 10) {
            throw new common_1.BadRequestException('Maximum 10 files can be imported at once');
        }
        const auth = await this.getAuthenticatedClient(userId);
        const drive = this.getDriveClient(auth);
        const results = [];
        for (const fileId of fileIds) {
            try {
                const fileMetadata = await this.getFileMetadataFromDrive(drive, fileId);
                const video = await this.prisma.video.create({
                    data: {
                        userId,
                        title: fileMetadata.name,
                        sourceType: 'MANUAL',
                        status: 'READY',
                        fileSize: fileMetadata.size ? BigInt(fileMetadata.size) : BigInt(0),
                        metadata: {
                            driveFileId: fileId,
                            driveFileName: fileMetadata.name,
                            driveMimeType: fileMetadata.mimeType,
                            importedAt: new Date().toISOString(),
                        },
                    },
                });
                results.push({
                    success: true,
                    fileId,
                    videoId: video.id,
                    fileName: fileMetadata.name,
                });
            }
            catch (error) {
                this.logger.error(`Error creating import for file ${fileId}: ${error.message}`);
                results.push({
                    success: false,
                    fileId,
                    error: error.message,
                });
            }
        }
        const successCount = results.filter((r) => r.success).length;
        return {
            message: `Started import for ${successCount} of ${fileIds.length} videos`,
            results,
        };
    }
    async getFileMetadata(userId, fileId) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = this.getDriveClient(auth);
        const file = await this.getFileMetadataFromDrive(drive, fileId);
        return { file };
    }
    async getFileMetadataFromDrive(drive, fileId) {
        const response = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
        });
        return {
            id: response.data.id,
            name: response.data.name,
            mimeType: response.data.mimeType,
            size: response.data.size || undefined,
            createdTime: response.data.createdTime || undefined,
            modifiedTime: response.data.modifiedTime || undefined,
            webViewLink: response.data.webViewLink || undefined,
            thumbnailLink: response.data.thumbnailLink || undefined,
            isFolder: response.data.mimeType === 'application/vnd.google-apps.folder',
        };
    }
};
exports.DriveService = DriveService;
exports.DriveService = DriveService = DriveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], DriveService);
//# sourceMappingURL=drive.service.js.map