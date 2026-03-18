import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    getAll(user: CurrentUserPayload): Promise<{
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
    connect(user: CurrentUserPayload, body: any): Promise<{
        message: string;
        account: {
            id: string;
            platform: import(".prisma/client").$Enums.Platform;
            username: string;
            status: import(".prisma/client").$Enums.AccountStatus;
        };
    }>;
    disconnect(user: CurrentUserPayload, id: string): Promise<{
        message: string;
    }>;
}
