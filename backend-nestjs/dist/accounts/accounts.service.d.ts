import { PrismaService } from '../prisma/prisma.service';
export declare class AccountsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): Promise<{
        accounts: {
            id: string;
            createdAt: Date;
            platform: import(".prisma/client").$Enums.Platform;
            accountId: string;
            username: string;
            tokenExpiry: Date | null;
            status: import(".prisma/client").$Enums.AccountStatus;
        }[];
    }>;
    connect(userId: string, data: {
        platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
        accessToken: string;
        refreshToken?: string;
        accountId: string;
        username: string;
        metadata?: any;
    }): Promise<{
        message: string;
        account: {
            id: string;
            platform: import(".prisma/client").$Enums.Platform;
            username: string;
            status: import(".prisma/client").$Enums.AccountStatus;
        };
    }>;
    disconnect(userId: string, id: string): Promise<{
        message: string;
    }>;
}
