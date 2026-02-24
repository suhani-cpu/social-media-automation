import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CaptionService } from '../caption/caption.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly captionService: CaptionService,
  ) {}

  @Post('generate-caption')
  async generateCaption(
    @Body() body: {
      videoTitle: string;
      videoDescription?: string;
      platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
      language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';
      tone?: string[];
      context?: string;
    },
  ) {
    const variations = await this.captionService.generate({
      videoTitle: body.videoTitle,
      videoDescription: body.videoDescription,
      platform: body.platform,
      language: body.language,
      tone: body.tone || ['engaging'],
      context: body.context,
    });
    return { variations };
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      videoId: string;
      accountId: string;
      caption: string;
      language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';
      hashtags?: string[];
      platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
      postType: 'FEED' | 'REEL' | 'STORY' | 'VIDEO' | 'SHORT';
      scheduledFor?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.postsService.create(user.id, body);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.postsService.findAll(user.id);
  }

  @Post('batch-publish')
  batchPublish(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { postIds: string[] },
  ) {
    return this.postsService.batchPublish(user.id, body.postIds);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.postsService.publish(user.id, id);
  }

  @Post(':id/retry')
  retryPublish(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.postsService.retryPublish(user.id, id);
  }

  @Get(':id/publish-progress')
  getPublishProgress(@Param('id') id: string) {
    return this.postsService.getPublishProgress(id);
  }

  @Get('scheduled/summary')
  getScheduledSummary() {
    return this.postsService.getScheduledSummary();
  }

  @Put(':id/reschedule')
  reschedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { scheduledFor: string },
  ) {
    return this.postsService.reschedule(user.id, id, body.scheduledFor);
  }

  @Delete(':id')
  deletePost(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.postsService.delete(user.id, id);
  }
}
