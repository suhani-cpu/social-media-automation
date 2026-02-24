import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

@Injectable()
export class DriveOAuthService {
  private readonly logger = new Logger(DriveOAuthService.name);

  /** Store CSRF tokens for OAuth state verification */
  private readonly pendingStates = new Map<string, { userId: string; expires: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.configService.get('GOOGLE_DRIVE_CLIENT_ID'),
      this.configService.get('GOOGLE_DRIVE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_DRIVE_REDIRECT_URI'),
    );
  }

  /**
   * Generate Google Drive OAuth authorization URL with CSRF-safe state token
   */
  async getAuthUrl(userId: string): Promise<string> {
    const client = this.createOAuth2Client();

    // Generate CSRF-safe state token
    const stateToken = crypto.randomBytes(32).toString('hex');
    this.pendingStates.set(stateToken, { userId, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: stateToken,
      prompt: 'consent',
    });

    return authUrl;
  }

  /**
   * Resolve and validate a CSRF state token, returning the associated userId
   */
  resolveState(stateToken: string): string {
    const entry = this.pendingStates.get(stateToken);
    if (!entry) {
      throw new Error('Invalid or expired OAuth state token');
    }
    if (Date.now() > entry.expires) {
      this.pendingStates.delete(stateToken);
      throw new Error('OAuth state token expired');
    }
    this.pendingStates.delete(stateToken);
    return entry.userId;
  }

  /**
   * Handle the OAuth callback: exchange code for tokens, fetch user info, and upsert the account
   */
  async handleCallback(code: string, userId: string) {
    const client = this.createOAuth2Client();

    try {
      this.logger.log(`Drive OAuth: exchanging code for tokens for user ${userId}`);
      const { tokens } = await client.getToken(code);
      this.logger.log(
        `Drive OAuth: tokens received, access_token: ${tokens.access_token ? 'YES' : 'NO'}, refresh_token: ${tokens.refresh_token ? 'YES' : 'NO'}`,
      );
      client.setCredentials(tokens);

      // Get user info from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const { data: userInfo } = await oauth2.userinfo.get();
      this.logger.log(`Drive OAuth: user info received - email: ${userInfo.email}, id: ${userInfo.id}`);

      // Store or update the Drive account
      const account = await this.prisma.socialAccount.upsert({
        where: {
          userId_platform_accountId: {
            userId,
            platform: 'GOOGLE_DRIVE',
            accountId: userInfo.id || userInfo.email || 'drive-user',
          },
        },
        update: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          username: userInfo.email || 'drive-user',
          status: 'ACTIVE',
        },
        create: {
          userId,
          platform: 'GOOGLE_DRIVE',
          accountId: userInfo.id || userInfo.email || 'drive-user',
          username: userInfo.email || 'drive-user',
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          status: 'ACTIVE',
        },
      });

      this.logger.log(`Google Drive account connected for user ${userId}`);
      return account;
    } catch (error) {
      this.logger.error('Error in Google Drive OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token for a Google Drive account
   */
  async refreshAccessToken(accountId: string): Promise<string | null | undefined> {
    try {
      const account = await this.prisma.socialAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || !account.refreshToken) {
        throw new Error('Account not found or no refresh token');
      }

      const client = this.createOAuth2Client();
      client.setCredentials({
        refresh_token: account.refreshToken,
      });

      const { credentials } = await client.refreshAccessToken();

      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });

      this.logger.log(`Access token refreshed for Google Drive account ${accountId}`);
      return credentials.access_token;
    } catch (error) {
      this.logger.error('Error refreshing Google Drive token:', error);
      throw error;
    }
  }

  /**
   * Get an authenticated OAuth2 client for the given user, refreshing the token if expired
   */
  async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: 'GOOGLE_DRIVE',
        status: 'ACTIVE',
      },
    });

    if (!account) {
      throw new Error('Google Drive account not connected');
    }

    const client = this.createOAuth2Client();

    // Check if token is expired
    if (account.tokenExpiry && account.tokenExpiry < new Date()) {
      await this.refreshAccessToken(account.id);
      const updatedAccount = await this.prisma.socialAccount.findUnique({
        where: { id: account.id },
      });
      if (updatedAccount) {
        client.setCredentials({
          access_token: updatedAccount.accessToken,
          refresh_token: updatedAccount.refreshToken || undefined,
        });
      }
    } else {
      client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken || undefined,
      });
    }

    return client;
  }

  /**
   * Disconnect Google Drive for a user by marking all their Drive accounts as DISCONNECTED
   */
  async disconnect(userId: string): Promise<void> {
    try {
      await this.prisma.socialAccount.updateMany({
        where: {
          userId,
          platform: 'GOOGLE_DRIVE',
        },
        data: {
          status: 'DISCONNECTED',
        },
      });

      this.logger.log(`Google Drive disconnected for user ${userId}`);
    } catch (error) {
      this.logger.error('Error disconnecting Google Drive:', error);
      throw error;
    }
  }
}
