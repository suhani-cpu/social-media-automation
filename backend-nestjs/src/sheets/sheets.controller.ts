import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SheetsService } from './sheets.service';

@Controller('sheets')
@UseGuards(JwtAuthGuard)
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  /**
   * GET /sheets/preview?sheetUrl=...
   * Preview the contents of a Google Sheet without importing.
   */
  @Get('preview')
  previewSheet(@Query('sheetUrl') sheetUrl: string) {
    return this.sheetsService.previewSheet(sheetUrl);
  }

  /**
   * POST /sheets/import
   * Import videos from a Google Sheet and auto-create Instagram posts.
   */
  @Post('import')
  importFromSheet(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { sheetUrl: string },
  ) {
    return this.sheetsService.importFromSheet(user.id, body.sheetUrl);
  }
}
