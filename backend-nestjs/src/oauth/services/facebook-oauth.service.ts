import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

@Injectable()
export class FacebookOAuthService {
  private readonly logger = new Logger(FacebookOAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate Facebook OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'publish_video',
    ];

    const params = new URLSearchParams({
      client_id: this.configService.get<string>('FACEBOOK_APP_ID', ''),
      redirect_uri: this.configService.get<string>('FACEBOOK_REDIRECT_URI', ''),
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
      const params = new URLSearchParams({
        client_id: this.configService.get<string>('FACEBOOK_APP_ID', ''),
        client_secret: this.configService.get<string>('FACEBOOK_APP_SECRET', ''),
        redirect_uri: this.configService.get<string>('FACEBOOK_REDIRECT_URI', ''),
        code,
      });

      const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
        params,
      });

      const { access_token } = response.data;

      this.logger.log('Facebook access token obtained');

      return {
        accessToken: access_token,
      };
    } catch (error) {
      this.logger.error('Failed to exchange Facebook authorization code:', error);
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
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.configService.get<string>('FACEBOOK_APP_ID', ''),
        client_secret: this.configService.get<string>('FACEBOOK_APP_SECRET', ''),
        fb_exchange_token: shortLivedToken,
      });

      const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
        params,
      });

      const { access_token, expires_in } = response.data;

      this.logger.log('Long-lived Facebook token obtained', {
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
   * Get user's Facebook Pages
   */
  async getPages(accessToken: string) {
    try {
      const response = await axios.get(`${FACEBOOK_API_BASE}/me/accounts`, {
        params: {
          access_token: accessToken,
        },
      });

      const pages = response.data.data;

      this.logger.log('Facebook pages fetched', {
        count: pages.length,
      });

      return pages.map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Facebook pages:', error);
      throw new Error(
        `Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get Page access token (required for posting)
   */
  async getPageAccessToken(userAccessToken: string, pageId: string): Promise<string> {
    try {
      const response = await axios.get(`${FACEBOOK_API_BASE}/${pageId}`, {
        params: {
          fields: 'access_token',
          access_token: userAccessToken,
        },
      });

      const pageAccessToken = response.data.access_token;

      this.logger.log('Page access token obtained', { pageId });

      return pageAccessToken;
    } catch (error) {
      this.logger.error('Failed to get page access token:', error);
      throw new Error(
        `Failed to get page access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      this.logger.log('Facebook token near expiry, refreshing...', { accountId });
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
   * Refresh Facebook access token
   * Note: Facebook long-lived tokens last 60 days and can be refreshed
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

      this.logger.log('Facebook token refreshed successfully', { accountId });
    } catch (error) {
      this.logger.error('Failed to refresh Facebook token:', error);

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
