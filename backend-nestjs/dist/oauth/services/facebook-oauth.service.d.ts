import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class FacebookOAuthService {
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
    getPages(accessToken: string): Promise<any>;
    getPageAccessToken(userAccessToken: string, pageId: string): Promise<string>;
    getValidAccessToken(accountId: string): Promise<string>;
    refreshToken(accountId: string): Promise<void>;
}
