import { PrismaService } from './prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    health(): {
        status: string;
        timestamp: string;
        uptime: number;
        environment: string;
    };
    healthDb(): Promise<{
        status: string;
        database: string;
        error?: undefined;
    } | {
        status: string;
        database: string;
        error: string;
    }>;
}
