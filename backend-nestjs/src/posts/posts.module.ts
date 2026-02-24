import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CaptionModule } from '../caption/caption.module';
import { SocialMediaModule } from '../social-media/social-media.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [ConfigModule, CaptionModule, SocialMediaModule, DriveModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
