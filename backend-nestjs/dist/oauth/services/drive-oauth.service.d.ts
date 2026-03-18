import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
export declare class DriveOAuthService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private readonly pendingStates;
    constructor(configService: ConfigService, prisma: PrismaService);
    private createOAuth2Client;
    getAuthUrl(userId: string): Promise<string>;
    resolveState(stateToken: string): string;
    handleCallback(code: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        platform: import(".prisma/client").$Enums.Platform;
        accountId: string;
        username: string;
        accessToken: string;
        refreshToken: string | null;
        tokenExpiry: Date | null;
        status: import(".prisma/client").$Enums.AccountStatus;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    refreshAccessToken(accountId: string): Promise<string | null | undefined>;
    getAuthenticatedClient(userId: string): Promise<OAuth2Client>;
    disconnect(userId: string): Promise<void>;
}
