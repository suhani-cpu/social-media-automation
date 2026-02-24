import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OAuthController } from './oauth.controller';
import { YouTubeOAuthService } from './services/youtube-oauth.service';
import { FacebookOAuthService } from './services/facebook-oauth.service';
import { InstagramOAuthService } from './services/instagram-oauth.service';
import { DriveOAuthService } from './services/drive-oauth.service';

@Module({
  imports: [ConfigModule],
  controllers: [OAuthController],
  providers: [
    YouTubeOAuthService,
    FacebookOAuthService,
    InstagramOAuthService,
    DriveOAuthService,
  ],
  exports: [
    YouTubeOAuthService,
    FacebookOAuthService,
    InstagramOAuthService,
    DriveOAuthService,
  ],
})
export class OAuthModule {}
