import axios from 'axios';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Generate Instagram OAuth authorization URL
 * Instagram uses Facebook OAuth for authentication
 */
export function getInstagramAuthUrl(state?: string): string {
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
  ];

  const params = new URLSearchParams({
    client_id: config.INSTAGRAM_APP_ID || config.FACEBOOK_APP_ID || '',
    redirect_uri: config.INSTAGRAM_REDIRECT_URI || '',
    scope: scopes.join(','),
    response_type: 'code',
    state: state || '',
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeInstagramCode(code: string) {
  try {
    const params = new URLSearchParams({
      client_id: config.INSTAGRAM_APP_ID || config.FACEBOOK_APP_ID || '',
      client_secret: config.INSTAGRAM_APP_SECRET || config.FACEBOOK_APP_SECRET || '',
      redirect_uri: config.INSTAGRAM_REDIRECT_URI || '',
      code,
    });

    const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
      params,
    });

    const { access_token } = response.data;

    logger.info('Instagram access token obtained');

    return {
      accessToken: access_token,
    };
  } catch (error) {
    logger.error('Failed to exchange Instagram authorization code:', error);
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
      client_id: config.INSTAGRAM_APP_ID || config.FACEBOOK_APP_ID || '',
      client_secret: config.INSTAGRAM_APP_SECRET || config.FACEBOOK_APP_SECRET || '',
      fb_exchange_token: shortLivedToken,
    });

    const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
      params,
    });

    const { access_token, expires_in } = response.data;

    logger.info('Long-lived Instagram token obtained', {
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
 * Get user's Facebook Pages that are linked to Instagram Business accounts
 */
export async function getInstagramAccounts(accessToken: string) {
  try {
    // First, get Facebook Pages
    const pagesResponse = await axios.get(`${FACEBOOK_API_BASE}/me/accounts`, {
      params: {
        access_token: accessToken,
      },
    });

    const pages = pagesResponse.data.data;

    // For each page, check if it has an Instagram Business account
    const instagramAccounts = [];

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
        logger.debug(`Page ${page.id} does not have Instagram account`, { pageId: page.id });
      }
    }

    logger.info('Instagram accounts fetched', {
      count: instagramAccounts.length,
    });

    return instagramAccounts;
  } catch (error) {
    logger.error('Failed to fetch Instagram accounts:', error);
    throw new Error(
      `Failed to fetch accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Refresh Instagram access token
 */
export async function refreshInstagramToken(accountId: string): Promise<void> {
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

    logger.info('Instagram token refreshed successfully', { accountId });
  } catch (error) {
    logger.error('Failed to refresh Instagram token:', error);

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
