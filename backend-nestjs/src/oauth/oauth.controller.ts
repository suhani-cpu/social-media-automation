import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  Logger,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { google } from 'googleapis';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeOAuthService } from './services/youtube-oauth.service';
import { FacebookOAuthService } from './services/facebook-oauth.service';
import { InstagramOAuthService } from './services/instagram-oauth.service';

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly youtubeOAuth: YouTubeOAuthService,
    private readonly facebookOAuth: FacebookOAuthService,
    private readonly instagramOAuth: InstagramOAuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // YouTube
  // ---------------------------------------------------------------------------

  @Get('youtube/authorize')
  @UseGuards(JwtAuthGuard)
  getYouTubeAuthUrl(@Req() req: any) {
    const userId = req.user.id;
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    const authUrl = this.youtubeOAuth.getAuthUrl(state);
    this.logger.log(`YouTube auth URL generated for user ${userId}`);
    return {
      authUrl,
      message: 'Redirect user to this URL to authorize YouTube access',
    };
  }

  @Get('youtube/callback')
  async youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      if (error) {
        this.logger.error('YouTube OAuth error', { error });
        return res.redirect(`${frontendUrl}/dashboard/accounts?error=youtube_auth_failed`);
      }

      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      if (!state) {
        throw new BadRequestException('Invalid state parameter');
      }

      let stateData: { userId: string; timestamp: number };
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        throw new BadRequestException('Invalid state parameter');
      }

      const { userId, timestamp } = stateData;

      // Verify state is not too old (10 minutes)
      if (Date.now() - timestamp > 10 * 60 * 1000) {
        throw new BadRequestException('Authorization request expired');
      }

      // Verify user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Exchanging YouTube authorization code for user ${userId}`);

      // Exchange code for tokens
      const tokens = await this.youtubeOAuth.exchangeCode(code);

      // Save tokens to DB immediately (before any API calls that might fail)
      // Use a temporary accountId derived from the token; we'll update with real channel info if possible
      let channelId = `yt-${userId}-${Date.now()}`;
      let channelTitle = user.email || 'YouTube Channel';
      let channelMeta: Record<string, any> = {};

      // Try to fetch channel details (best-effort — YouTube Data API might not be enabled)
      try {
        const oauth2Client = this.youtubeOAuth.createOAuth2Client();
        oauth2Client.setCredentials({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken || undefined,
        });

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelResponse = await youtube.channels.list({
          part: ['snippet', 'statistics'],
          mine: true,
        });

        const channel = channelResponse.data.items?.[0];
        if (channel?.id) {
          channelId = channel.id;
          channelTitle = channel.snippet?.title || channelTitle;
          channelMeta = {
            channelTitle,
            subscriberCount: channel.statistics?.subscriberCount,
            videoCount: channel.statistics?.videoCount,
          };
        }
      } catch (apiErr: any) {
        this.logger.warn(`Could not fetch YouTube channel details (API may not be enabled): ${apiErr.message}`);
      }

      // Check if account already exists for this user + platform
      const existingAccount = await this.prisma.socialAccount.findFirst({
        where: { userId, platform: 'YOUTUBE' },
      });

      if (existingAccount) {
        await this.prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accountId: channelId,
            username: channelTitle,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiry: tokens.expiryDate,
            status: 'ACTIVE',
            metadata: channelMeta,
          },
        });
        this.logger.log(`YouTube account updated for user ${userId}`);
      } else {
        await this.prisma.socialAccount.create({
          data: {
            userId,
            platform: 'YOUTUBE',
            accountId: channelId,
            username: channelTitle,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiry: tokens.expiryDate,
            status: 'ACTIVE',
            metadata: channelMeta,
          },
        });
        this.logger.log(`YouTube account connected for user ${userId}`);
      }

      return res.redirect(`${frontendUrl}/dashboard/accounts?success=youtube_connected`);
    } catch (err) {
      this.logger.error('YouTube callback error:', err);
      return res.redirect(`${frontendUrl}/dashboard/accounts?error=youtube_connection_failed`);
    }
  }

  // ---------------------------------------------------------------------------
  // Facebook
  // ---------------------------------------------------------------------------

  @Get('facebook/authorize')
  @UseGuards(JwtAuthGuard)
  getFacebookAuthUrl(@Req() req: any) {
    const userId = req.user.id;
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    const authUrl = this.facebookOAuth.getAuthUrl(state);
    this.logger.log(`Facebook auth URL generated for user ${userId}`);
    return {
      authUrl,
      message: 'Redirect user to this URL to authorize Facebook access',
    };
  }

  @Get('facebook/callback')
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      if (error) {
        this.logger.error('Facebook OAuth error', { error });
        return res.redirect(`${frontendUrl}/dashboard/accounts?error=facebook_auth_failed`);
      }

      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      if (!state) {
        throw new BadRequestException('Invalid state parameter');
      }

      let stateData: { userId: string; timestamp: number };
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        throw new BadRequestException('Invalid state parameter');
      }

      const { userId, timestamp } = stateData;

      // Verify state is not too old (10 minutes)
      if (Date.now() - timestamp > 10 * 60 * 1000) {
        throw new BadRequestException('Authorization request expired');
      }

      // Verify user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Exchanging Facebook authorization code for user ${userId}`);

      // Exchange code for short-lived token
      const { accessToken: shortLivedToken } = await this.facebookOAuth.exchangeCode(code);

      // Exchange for long-lived token (60 days)
      const { accessToken, expiryDate } = await this.facebookOAuth.exchangeForLongLivedToken(shortLivedToken);

      // Get user's Facebook Pages
      const pages = await this.facebookOAuth.getPages(accessToken);

      if (pages.length === 0) {
        this.logger.warn(`No Facebook pages found for user ${userId}`);
        return res.redirect(`${frontendUrl}/dashboard/accounts?error=no_facebook_pages`);
      }

      // Save all pages (user can choose which to use later)
      let connectedCount = 0;
      for (const page of pages) {
        const existingAccount = await this.prisma.socialAccount.findFirst({
          where: { userId, platform: 'FACEBOOK', accountId: page.id },
        });

        if (existingAccount) {
          await this.prisma.socialAccount.update({
            where: { id: existingAccount.id },
            data: {
              accessToken: page.accessToken,
              tokenExpiry: expiryDate,
              status: 'ACTIVE',
              metadata: {
                pageName: page.name,
                category: page.category,
              },
            },
          });
        } else {
          await this.prisma.socialAccount.create({
            data: {
              userId,
              platform: 'FACEBOOK',
              accountId: page.id,
              username: page.name,
              accessToken: page.accessToken,
              tokenExpiry: expiryDate,
              status: 'ACTIVE',
              metadata: {
                pageName: page.name,
                category: page.category,
              },
            },
          });
        }

        connectedCount++;
      }

      this.logger.log(`Facebook pages connected for user ${userId}, count: ${connectedCount}`);

      return res.redirect(`${frontendUrl}/dashboard/accounts?success=facebook_connected&pages=${connectedCount}`);
    } catch (err) {
      this.logger.error('Facebook callback error:', err);
      return res.redirect(`${frontendUrl}/dashboard/accounts?error=facebook_connection_failed`);
    }
  }

  // ---------------------------------------------------------------------------
  // Instagram
  // ---------------------------------------------------------------------------

  @Get('instagram/authorize')
  @UseGuards(JwtAuthGuard)
  getInstagramAuthUrl(@Req() req: any) {
    const userId = req.user.id;
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    const authUrl = this.instagramOAuth.getAuthUrl(state);
    this.logger.log(`Instagram auth URL generated for user ${userId}`);
    return {
      authUrl,
      message: 'Redirect user to this URL to authorize Instagram access',
    };
  }

  @Get('instagram/callback')
  async instagramCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

    try {
      if (error) {
        this.logger.error('Instagram OAuth error', { error });
        return res.redirect(`${frontendUrl}/dashboard/accounts?error=instagram_auth_failed`);
      }

      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      if (!state) {
        throw new BadRequestException('Invalid state parameter');
      }

      let stateData: { userId: string; timestamp: number };
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        throw new BadRequestException('Invalid state parameter');
      }

      const { userId, timestamp } = stateData;

      // Verify state is not too old (10 minutes)
      if (Date.now() - timestamp > 10 * 60 * 1000) {
        throw new BadRequestException('Authorization request expired');
      }

      // Verify user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`Exchanging Instagram authorization code for user ${userId}`);

      // Exchange code for short-lived token
      const { accessToken: shortLivedToken } = await this.instagramOAuth.exchangeCode(code);

      // Exchange for long-lived token (60 days)
      const { accessToken, expiryDate } = await this.instagramOAuth.exchangeForLongLivedToken(shortLivedToken);

      // Get Instagram Business accounts
      const instagramAccounts = await this.instagramOAuth.getAccounts(accessToken);

      if (instagramAccounts.length === 0) {
        this.logger.warn(`No Instagram Business accounts found for user ${userId}`);
        return res.redirect(`${frontendUrl}/dashboard/accounts?error=no_instagram_accounts`);
      }

      // Save all Instagram accounts
      let connectedCount = 0;
      for (const igAccount of instagramAccounts as Array<{ id: string; username: string; profilePicture: string; followersCount: number; mediaCount: number; pageId: string; pageName: string; pageAccessToken: string }>) {
        const existingAccount = await this.prisma.socialAccount.findFirst({
          where: { userId, platform: 'INSTAGRAM', accountId: igAccount.id },
        });

        if (existingAccount) {
          await this.prisma.socialAccount.update({
            where: { id: existingAccount.id },
            data: {
              accessToken: igAccount.pageAccessToken,
              tokenExpiry: expiryDate,
              status: 'ACTIVE',
              metadata: {
                username: igAccount.username,
                profilePicture: igAccount.profilePicture,
                followersCount: igAccount.followersCount,
                mediaCount: igAccount.mediaCount,
                pageId: igAccount.pageId,
                pageName: igAccount.pageName,
              },
            },
          });
        } else {
          await this.prisma.socialAccount.create({
            data: {
              userId,
              platform: 'INSTAGRAM',
              accountId: igAccount.id,
              username: igAccount.username,
              accessToken: igAccount.pageAccessToken,
              tokenExpiry: expiryDate,
              status: 'ACTIVE',
              metadata: {
                username: igAccount.username,
                profilePicture: igAccount.profilePicture,
                followersCount: igAccount.followersCount,
                mediaCount: igAccount.mediaCount,
                pageId: igAccount.pageId,
                pageName: igAccount.pageName,
              },
            },
          });
        }

        connectedCount++;
      }

      this.logger.log(`Instagram accounts connected for user ${userId}, count: ${connectedCount}`);

      return res.redirect(
        `${frontendUrl}/dashboard/accounts?success=instagram_connected&accounts=${connectedCount}`,
      );
    } catch (err) {
      this.logger.error('Instagram callback error:', err);
      return res.redirect(`${frontendUrl}/dashboard/accounts?error=instagram_connection_failed`);
    }
  }
}
