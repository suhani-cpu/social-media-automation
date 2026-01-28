import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Create OAuth2 client for YouTube API
 */
export function createYouTubeOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    config.YOUTUBE_CLIENT_ID,
    config.YOUTUBE_CLIENT_SECRET,
    config.YOUTUBE_REDIRECT_URI
  );
}

/**
 * Generate YouTube OAuth authorization URL
 */
export function getYouTubeAuthUrl(state?: string): string {
  const oauth2Client = createYouTubeOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes,
    state: state || '',
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeYouTubeCode(code: string) {
  const oauth2Client = createYouTubeOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    logger.info('YouTube tokens obtained', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    };
  } catch (error) {
    logger.error('Failed to exchange YouTube authorization code:', error);
    throw new Error(
      `Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get authenticated OAuth2 client with auto-refresh
 */
export async function getYouTubeAuthClient(accountId: string): Promise<OAuth2Client> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Social account ${accountId} not found`);
  }

  if (account.platform !== 'YOUTUBE') {
    throw new Error(`Account ${accountId} is not a YouTube account`);
  }

  const oauth2Client = createYouTubeOAuth2Client();

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken || undefined,
    expiry_date: account.tokenExpiry?.getTime(),
  });

  // Auto-refresh handler
  oauth2Client.on('tokens', async (tokens) => {
    logger.info('YouTube tokens refreshed', {
      accountId,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    // Update tokens in database
    const updateData: any = {};

    if (tokens.access_token) {
      updateData.accessToken = tokens.access_token;
    }

    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token;
    }

    if (tokens.expiry_date) {
      updateData.tokenExpiry = new Date(tokens.expiry_date);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: updateData,
      });

      logger.info('YouTube tokens updated in database', { accountId });
    }
  });

  return oauth2Client;
}

/**
 * Refresh YouTube access token
 */
export async function refreshYouTubeToken(accountId: string): Promise<void> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Social account ${accountId} not found`);
  }

  if (!account.refreshToken) {
    throw new Error(`No refresh token available for account ${accountId}`);
  }

  const oauth2Client = createYouTubeOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: account.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: credentials.access_token!,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });

    logger.info('YouTube token refreshed successfully', { accountId });
  } catch (error) {
    logger.error('Failed to refresh YouTube token:', error);

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
