import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { StageOttService } from './stage-ott.service';

@Controller('stage-ott')
@UseGuards(JwtAuthGuard)
export class StageOttController {
  constructor(private readonly stageOttService: StageOttService) {}

  /**
   * GET /stage-ott/content
   * List content from Stage OTT CMS.
   */
  @Get('content')
  listContent(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('dialect') dialect?: string,
  ) {
    return this.stageOttService.listContent({
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      dialect,
    });
  }

  /**
   * POST /stage-ott/import
   * Import a single content item from Stage OTT.
   */
  @Post('import')
  importContent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      oldContentId: number;
      title: string;
      description?: string;
      thumbnailURL?: string;
      dialect?: string;
      duration?: number;
      slug?: string;
      contentType?: string;
      format?: string;
    },
  ) {
    return this.stageOttService.importContent(user.id, body);
  }

  /**
   * POST /stage-ott/import-multiple
   * Bulk import content items from Stage OTT.
   */
  @Post('import-multiple')
  importMultiple(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      items: Array<{
        oldContentId: number;
        title: string;
        description?: string;
        thumbnailURL?: string;
        dialect?: string;
        duration?: number;
        slug?: string;
        contentType?: string;
        format?: string;
      }>;
    },
  ) {
    return this.stageOttService.importMultiple(user.id, body.items);
  }
}
