import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { ClipsService, ClipVideoDto } from './clips.service';

@Controller('clip')
@UseGuards(JwtAuthGuard)
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  /**
   * POST /clip
   * Clip a video segment with optional framing and overlay.
   */
  @Post()
  clipVideo(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: ClipVideoDto,
  ) {
    return this.clipsService.clipVideo(user.id, body);
  }
}
