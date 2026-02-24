import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate Instagram OAuth authorization URL
   * Instagram uses Facebook OAuth for authentication
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ];

    const clientId =
      this.configService.get<string>('INSTAGRAM_APP_ID') ||
      this.configService.get<string>('FACEBOOK_APP_ID', '');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.configService.get<string>('INSTAGRAM_REDIRECT_URI', ''),
      scope: scopes.join(','),
      response_type: 'code',
      state: state || '',
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<{ accessToken: string }> {
    try {
      const clientId =
        this.configService.get<string>('INSTAGRAM_APP_ID') ||
        this.configService.get<string>('FACEBOOK_APP_ID', '');
      const clientSecret =
        this.configService.get<string>('INSTAGRAM_APP_SECRET') ||
        this.configService.get<string>('FACEBOOK_APP_SECRET', '');

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: this.configService.get<string>('INSTAGRAM_REDIRECT_URI', ''),
        code,
      });

      const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
        params,
      });

      const { access_token } = response.data;

      this.logger.log('Instagram access token obtained');

      return {
        accessToken: access_token,
      };
    } catch (error) {
      this.logger.error('Failed to exchange Instagram authorization code:', error);
      throw new Error(
        `Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<{ accessToken: string; expiryDate: Date }> {
    try {
      const clientId =
        this.configService.get<string>('INSTAGRAM_APP_ID') ||
        this.configService.get<string>('FACEBOOK_APP_ID', '');
      const clientSecret =
        this.configService.get<string>('INSTAGRAM_APP_SECRET') ||
        this.configService.get<string>('FACEBOOK_APP_SECRET', '');

      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken,
      });

      const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
        params,
      });

      const { access_token, expires_in } = response.data;

      this.logger.log('Long-lived Instagram token obtained', {
        expiresIn: expires_in,
      });

      return {
        accessToken: access_token,
        expiryDate: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to exchange for long-lived token:', error);
      throw new Error(
        `Failed to exchange for long-lived token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get user's Facebook Pages that are linked to Instagram Business accounts
   */
  async getAccounts(accessToken: string) {
    try {
      // First, get Facebook Pages
      const pagesResponse = await axios.get(`${FACEBOOK_API_BASE}/me/accounts`, {
        params: {
          access_token: accessToken,
        },
      });

      const pages = pagesResponse.data.data;

      // For each page, check if it has an Instagram Business account
      const instagramAccounts: Array<{
        id: string;
        username: string;
        profilePicture: string;
        followersCount: number;
        mediaCount: number;
        pageId: string;
        pageName: string;
        pageAccessToken: string;
      }> = [];

      for (const page of pages) {
        try {
          const igResponse = await axios.get(`${FACEBOOK_API_BASE}/${page.id}`, {
            params: {
              fields: 'instagram_business_account',
              access_token: page.access_token,
            },
          });

          if (igResponse.data.instagram_business_account) {
            const igAccountId = igResponse.data.instagram_business_account.id;

            // Get Instagram account details
            const igDetailsResponse = await axios.get(`${FACEBOOK_API_BASE}/${igAccountId}`, {
              params: {
                fields: 'id,username,profile_picture_url,followers_count,media_count',
                access_token: page.access_token,
              },
            });

            instagramAccounts.push({
              id: igAccountId,
              username: igDetailsResponse.data.username,
              profilePicture: igDetailsResponse.data.profile_picture_url,
              followersCount: igDetailsResponse.data.followers_count,
              mediaCount: igDetailsResponse.data.media_count,
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: page.access_token,
            });
          }
        } catch (error) {
          // This page doesn't have Instagram linked, skip it
          this.logger.debug(`Page ${page.id} does not have Instagram account`);
        }
      }

      this.logger.log('Instagram accounts fetched', {
        count: instagramAccounts.length,
      });

      return instagramAccounts;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram accounts:', error);
      throw new Error(
        `Failed to fetch accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a valid access token for the account, refreshing if expired or near expiry.
   */
  async getValidAccessToken(accountId: string): Promise<string> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Social account ${accountId} not found`);
    }

    // If token expires within 7 days, refresh proactively
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (account.tokenExpiry && account.tokenExpiry < sevenDaysFromNow) {
      this.logger.log('Instagram token near expiry, refreshing...', { accountId });
      try {
        await this.refreshToken(accountId);
        const refreshed = await this.prisma.socialAccount.findUnique({ where: { id: accountId } });
        return refreshed!.accessToken;
      } catch (err) {
        this.logger.warn('Token refresh failed, using existing token', { accountId });
      }
    }

    return account.accessToken;
  }

  /**
   * Refresh Instagram access token
   */
  async refreshToken(accountId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Social account ${accountId} not found`);
    }

    try {
      // Get new long-lived token
      const { accessToken, expiryDate } = await this.exchangeForLongLivedToken(account.accessToken);

      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken,
          tokenExpiry: expiryDate,
        },
      });

      this.logger.log('Instagram token refreshed successfully', { accountId });
    } catch (error) {
      this.logger.error('Failed to refresh Instagram token:', error);

      // Mark account as expired
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: 'EXPIRED' },
      });

      throw new Error(
        `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
