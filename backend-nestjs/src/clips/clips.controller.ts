import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { ClipsService, ClipVideoDto } from './clips.service';
import { createReadStream, statSync, unlinkSync } from 'fs';

@Controller('clip')
@UseGuards(JwtAuthGuard)
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  /**
   * POST /clip
   * Clip a video segment with optional framing and overlay.
   * Returns the processed video file as a downloadable stream.
   */
  @Post()
  async clipVideo(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: ClipVideoDto,
    @Res() res: Response,
  ) {
    const result = await this.clipsService.clipVideo(user.id, body);
    const outputPath = result.clip.outputPath;

    try {
      const stat = statSync(outputPath);

      res.set({
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="clip-${result.clip.videoId}.mp4"`,
        'Cache-Control': 'no-cache',
      });

      const stream = createReadStream(outputPath);
      stream.on('end', () => {
        // Clean up temp file after streaming
        try { unlinkSync(outputPath); } catch { /* ignore */ }
      });
      stream.pipe(res);
    } catch (error) {
      // Clean up on error
      try { unlinkSync(outputPath); } catch { /* ignore */ }
      throw error;
    }
  }
}
