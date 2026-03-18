import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class InstagramOAuthService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService);
    getAuthUrl(state?: string): string;
    exchangeCode(code: string): Promise<{
        accessToken: string;
    }>;
    exchangeForLongLivedToken(shortLivedToken: string): Promise<{
        accessToken: string;
        expiryDate: Date;
    }>;
    getAccounts(accessToken: string): Promise<{
        id: string;
        username: string;
        profilePicture: string;
        followersCount: number;
        mediaCount: number;
        pageId: string;
        pageName: string;
        pageAccessToken: string;
    }[]>;
    getValidAccessToken(accountId: string): Promise<string>;
    refreshToken(accountId: string): Promise<void>;
}
