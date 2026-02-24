import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { DriveService } from './drive.service';

@Controller('drive')
export class DriveController {
  private readonly logger = new Logger(DriveController.name);

  constructor(
    private readonly driveService: DriveService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /drive/auth
   * Start the Google Drive OAuth flow.
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  startAuth(@CurrentUser() user: CurrentUserPayload) {
    return this.driveService.startAuth(user.id);
  }

  /**
   * GET /drive/callback
   * Handle the Google Drive OAuth callback.
   * This endpoint is NOT guarded -- the state token carries user identity.
   * Redirects the browser to the frontend with a success/error query param.
   */
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oauthError: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    try {
      if (oauthError) {
        throw new Error(`Google OAuth error: ${oauthError}`);
      }

      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      const redirectUrl = await this.driveService.handleCallback(code, state);
      return res.redirect(redirectUrl);
    } catch (error: any) {
      this.logger.error(
        `Drive callback error: ${error?.message || error}`,
      );
      const errorMsg = encodeURIComponent(
        error?.message || 'Unknown error',
      );
      return res.redirect(
        `${frontendUrl}/dashboard/accounts?drive=error&drive_error=${errorMsg}`,
      );
    }
  }

  /**
   * GET /drive/status
   * Get the current Drive connection status.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.driveService.getStatus(user.id);
  }

  /**
   * DELETE /drive/disconnect
   * Disconnect the Google Drive account.
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  disconnect(@CurrentUser() user: CurrentUserPayload) {
    return this.driveService.disconnect(user.id);
  }

  /**
   * GET /drive/folders
   * List folders in a Google Drive directory.
   * Query params: parentId (optional).
   */
  @Get('folders')
  @UseGuards(JwtAuthGuard)
  listFolders(
    @CurrentUser() user: CurrentUserPayload,
    @Query('parentId') parentId?: string,
  ) {
    return this.driveService.listFolders(user.id, parentId);
  }

  /**
   * GET /drive/files
   * List files in a Google Drive folder.
   * Query params: folderId (optional), videosOnly (default 'true').
   */
  @Get('files')
  @UseGuards(JwtAuthGuard)
  listFiles(
    @CurrentUser() user: CurrentUserPayload,
    @Query('folderId') folderId?: string,
    @Query('videosOnly') videosOnly: string = 'true',
  ) {
    return this.driveService.listFiles(
      user.id,
      folderId,
      videosOnly === 'true',
    );
  }

  /**
   * POST /drive/import
   * Import a single video from Google Drive.
   */
  @Post('import')
  @UseGuards(JwtAuthGuard)
  importVideo(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { fileId: string; title?: string },
  ) {
    return this.driveService.importVideo(user.id, body.fileId, body.title);
  }

  /**
   * POST /drive/import/batch
   * Import multiple videos from Google Drive (max 10).
   */
  @Post('import/batch')
  @UseGuards(JwtAuthGuard)
  importBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { fileIds: string[] },
  ) {
    return this.driveService.importMultiple(user.id, body.fileIds);
  }

  /**
   * POST /drive/import/multiple
   * Alias for /import/batch — frontend uses this path.
   */
  @Post('import/multiple')
  @UseGuards(JwtAuthGuard)
  importMultiple(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { fileIds: string[] },
  ) {
    return this.driveService.importMultiple(user.id, body.fileIds);
  }

  /**
   * GET /drive/files/:fileId/metadata
   * Get metadata for a specific Drive file.
   */
  @Get('files/:fileId/metadata')
  @UseGuards(JwtAuthGuard)
  getFileMetadata(
    @CurrentUser() user: CurrentUserPayload,
    @Param('fileId') fileId: string,
  ) {
    return this.driveService.getFileMetadata(user.id, fileId);
  }
}
