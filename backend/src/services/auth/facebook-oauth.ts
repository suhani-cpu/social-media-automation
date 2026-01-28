import axios from 'axios';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(state?: string): string {
  const scopes = [
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list',
    'publish_video',
  ];

  const params = new URLSearchParams({
    client_id: config.FACEBOOK_APP_ID!,
    redirect_uri: config.FACEBOOK_REDIRECT_URI!,
    scope: scopes.join(','),
    response_type: 'code',
    state: state || '',
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(code: string) {
  try {
    const params = new URLSearchParams({
      client_id: config.FACEBOOK_APP_ID!,
      client_secret: config.FACEBOOK_APP_SECRET!,
      redirect_uri: config.FACEBOOK_REDIRECT_URI!,
      code,
    });

    const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
      params,
    });

    const { access_token } = response.data;

    logger.info('Facebook access token obtained');

    return {
      accessToken: access_token,
    };
  } catch (error) {
    logger.error('Failed to exchange Facebook authorization code:', error);
    throw new Error(
      `Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function exchangeForLongLivedToken(shortLivedToken: string) {
  try {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: config.FACEBOOK_APP_ID!,
      client_secret: config.FACEBOOK_APP_SECRET!,
      fb_exchange_token: shortLivedToken,
    });

    const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
      params,
    });

    const { access_token, expires_in } = response.data;

    logger.info('Long-lived Facebook token obtained', {
      expiresIn: expires_in,
    });

    return {
      accessToken: access_token,
      expiryDate: new Date(Date.now() + expires_in * 1000),
    };
  } catch (error) {
    logger.error('Failed to exchange for long-lived token:', error);
    throw new Error(
      `Failed to exchange for long-lived token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get user's Facebook Pages
 */
export async function getFacebookPages(accessToken: string) {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/me/accounts`, {
      params: {
        access_token: accessToken,
      },
    });

    const pages = response.data.data;

    logger.info('Facebook pages fetched', {
      count: pages.length,
    });

    return pages.map((page: any) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      category: page.category,
    }));
  } catch (error) {
    logger.error('Failed to fetch Facebook pages:', error);
    throw new Error(
      `Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Page access token (required for posting)
 */
export async function getPageAccessToken(
  userAccessToken: string,
  pageId: string
): Promise<string> {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/${pageId}`, {
      params: {
        fields: 'access_token',
        access_token: userAccessToken,
      },
    });

    const pageAccessToken = response.data.access_token;

    logger.info('Page access token obtained', { pageId });

    return pageAccessToken;
  } catch (error) {
    logger.error('Failed to get page access token:', error);
    throw new Error(
      `Failed to get page access token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Refresh Facebook access token
 * Note: Facebook long-lived tokens last 60 days and can be refreshed
 */
export async function refreshFacebookToken(accountId: string): Promise<void> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Social account ${accountId} not found`);
  }

  try {
    // Get new long-lived token
    const { accessToken, expiryDate } = await exchangeForLongLivedToken(account.accessToken);

    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken,
        tokenExpiry: expiryDate,
      },
    });

    logger.info('Facebook token refreshed successfully', { accountId });
  } catch (error) {
    logger.error('Failed to refresh Facebook token:', error);

    // Mark account as expired
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: 'EXPIRED' },
    });

    throw new Error(
      `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
