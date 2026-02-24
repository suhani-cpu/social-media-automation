import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { OAuthModule } from '../oauth/oauth.module';
import { VideoProcessingModule } from '../video-processing/video-processing.module';
import { YouTubeService } from './youtube/youtube.service';
import { InstagramService } from './instagram/instagram.service';
import { FacebookService } from './facebook/facebook.service';

@Module({
  imports: [ConfigModule, PrismaModule, StorageModule, OAuthModule, VideoProcessingModule],
  providers: [YouTubeService, InstagramService, FacebookService],
  exports: [YouTubeService, InstagramService, FacebookService],
})
export class SocialMediaModule {}
