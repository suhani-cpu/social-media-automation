import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    updateProfile(user: CurrentUserPayload, body: {
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
    completeOnboarding(user: CurrentUserPayload, body: {
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
    getMe(user: CurrentUserPayload): Promise<{
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
