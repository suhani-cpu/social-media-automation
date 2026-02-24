import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class YouTubeOAuthService {
  private readonly logger = new Logger(YouTubeOAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.configService.get('YOUTUBE_CLIENT_ID'),
      this.configService.get('YOUTUBE_CLIENT_SECRET'),
      this.configService.get('YOUTUBE_REDIRECT_URI', 'http://localhost:3000/api/oauth/youtube/callback'),
    );
  }

  getAuthUrl(state?: string): string {
    const client = this.createOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
      state: state || '',
      prompt: 'consent',
    });
  }

  async exchangeCode(code: string) {
    const client = this.createOAuth2Client();
    const { tokens } = await client.getToken(code);
    this.logger.log(`YouTube tokens obtained: access=${!!tokens.access_token}, refresh=${!!tokens.refresh_token}`);
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
  }

  async getAuthClient(accountId: string): Promise<OAuth2Client> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account || account.platform !== 'YOUTUBE') {
      throw new Error(`YouTube account ${accountId} not found`);
    }

    const client = this.createOAuth2Client();
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken || undefined,
      expiry_date: account.tokenExpiry?.getTime(),
    });

    client.on('tokens', async (tokens) => {
      const updateData: any = {};
      if (tokens.access_token) updateData.accessToken = tokens.access_token;
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date) updateData.tokenExpiry = new Date(tokens.expiry_date);
      if (Object.keys(updateData).length > 0) {
        await this.prisma.socialAccount.update({ where: { id: accountId }, data: updateData });
        this.logger.log(`YouTube tokens refreshed for account ${accountId}`);
      }
    });

    return client;
  }

  async refreshToken(accountId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (!account?.refreshToken) throw new Error('No refresh token available');

    const client = this.createOAuth2Client();
    client.setCredentials({ refresh_token: account.refreshToken });

    try {
      const { credentials } = await client.refreshAccessToken();
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });
      this.logger.log(`YouTube token refreshed for ${accountId}`);
    } catch (error) {
      await this.prisma.socialAccount.update({ where: { id: accountId }, data: { status: 'EXPIRED' } });
      throw error;
    }
  }
}
