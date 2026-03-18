import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeOAuthService } from './services/youtube-oauth.service';
import { FacebookOAuthService } from './services/facebook-oauth.service';
import { InstagramOAuthService } from './services/instagram-oauth.service';
export declare class OAuthController {
    private readonly configService;
    private readonly prisma;
    private readonly youtubeOAuth;
    private readonly facebookOAuth;
    private readonly instagramOAuth;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, youtubeOAuth: YouTubeOAuthService, facebookOAuth: FacebookOAuthService, instagramOAuth: InstagramOAuthService);
    getYouTubeAuthUrl(req: any): {
        authUrl: string;
        message: string;
    };
    youtubeCallback(code: string, state: string, error: string, res: Response): Promise<void>;
    getFacebookAuthUrl(req: any): {
        authUrl: string;
        message: string;
    };
    facebookCallback(code: string, state: string, error: string, res: Response): Promise<void>;
    getInstagramAuthUrl(req: any): {
        authUrl: string;
        message: string;
    };
    instagramCallback(code: string, state: string, error: string, res: Response): Promise<void>;
}
