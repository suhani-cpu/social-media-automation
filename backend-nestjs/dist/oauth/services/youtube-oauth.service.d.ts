import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
export declare class YouTubeOAuthService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService);
    createOAuth2Client(): OAuth2Client;
    getAuthUrl(state?: string): string;
    exchangeCode(code: string): Promise<{
        accessToken: string;
        refreshToken: string | null;
        expiryDate: Date | null;
    }>;
    getAuthClient(accountId: string): Promise<OAuth2Client>;
    refreshToken(accountId: string): Promise<void>;
}
