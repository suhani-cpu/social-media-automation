import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            email: string;
            name: string;
            id: string;
            brandName: string | null;
            industry: string | null;
            onboardingComplete: boolean;
            defaultLanguage: string;
            defaultPrivacy: string;
            createdAt: Date;
        };
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            name: string;
            brandName: string | null;
            industry: string | null;
            onboardingComplete: boolean;
            defaultLanguage: string;
            defaultPrivacy: string;
        };
        token: string;
    }>;
    updateProfile(userId: string, data: {
        name?: string;
        brandName?: string;
        industry?: string;
        logoUrl?: string;
        defaultLanguage?: string;
        defaultPrivacy?: string;
    }): Promise<{
        message: string;
        user: {
            email: string;
            name: string;
            id: string;
            brandName: string | null;
            industry: string | null;
            logoUrl: string | null;
            onboardingComplete: boolean;
            defaultLanguage: string;
            defaultPrivacy: string;
        };
    }>;
    completeOnboarding(userId: string, data: {
        brandName?: string;
        industry?: string;
        defaultLanguage?: string;
    }): Promise<{
        message: string;
        user: {
            email: string;
            name: string;
            id: string;
            brandName: string | null;
            industry: string | null;
            onboardingComplete: boolean;
            defaultLanguage: string;
            defaultPrivacy: string;
        };
    }>;
    getMe(userId: string): Promise<{
        user: {
            email: string;
            name: string;
            id: string;
            brandName: string | null;
            industry: string | null;
            logoUrl: string | null;
            onboardingComplete: boolean;
            defaultLanguage: string;
            defaultPrivacy: string;
            createdAt: Date;
            _count: {
                socialAccounts: number;
                posts: number;
                videos: number;
            };
        } | null;
    }>;
}
