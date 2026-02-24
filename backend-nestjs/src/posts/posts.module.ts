import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CaptionModule } from '../caption/caption.module';
import { SocialMediaModule } from '../social-media/social-media.module';

@Module({
  imports: [ConfigModule, CaptionModule, SocialMediaModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
