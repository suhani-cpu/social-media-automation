import { google } from 'googleapis';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export async function getAuthUrl(userId: string): Promise<string> {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId,
    prompt: 'consent',
  });

  return authUrl;
}

export async function handleCallback(code: string, userId: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Store or update the Drive account
    const account = await prisma.socialAccount.upsert({
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

    logger.info(`Google Drive account connected for user ${userId}`);
    return account;
  } catch (error) {
    logger.error('Error in Google Drive OAuth callback:', error);
    throw error;
  }
}

export async function refreshAccessToken(accountId: string) {
  try {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || !account.refreshToken) {
      throw new Error('Account not found or no refresh token');
    }

    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: credentials.access_token!,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    });

    logger.info(`Access token refreshed for Google Drive account ${accountId}`);
    return credentials.access_token;
  } catch (error) {
    logger.error('Error refreshing Google Drive token:', error);
    throw error;
  }
}

export async function getAuthenticatedClient(userId: string) {
  const account = await prisma.socialAccount.findFirst({
    where: {
      userId,
      platform: 'GOOGLE_DRIVE',
      status: 'ACTIVE',
    },
  });

  if (!account) {
    throw new Error('Google Drive account not connected');
  }

  // Check if token is expired
  if (account.tokenExpiry && account.tokenExpiry < new Date()) {
    await refreshAccessToken(account.id);
    // Fetch updated account
    const updatedAccount = await prisma.socialAccount.findUnique({
      where: { id: account.id },
    });
    if (updatedAccount) {
      oauth2Client.setCredentials({
        access_token: updatedAccount.accessToken,
        refresh_token: updatedAccount.refreshToken || undefined,
      });
    }
  } else {
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken || undefined,
    });
  }

  return oauth2Client;
}

export async function disconnectDrive(userId: string) {
  try {
    await prisma.socialAccount.updateMany({
      where: {
        userId,
        platform: 'GOOGLE_DRIVE',
      },
      data: {
        status: 'DISCONNECTED',
      },
    });

    logger.info(`Google Drive disconnected for user ${userId}`);
  } catch (error) {
    logger.error('Error disconnecting Google Drive:', error);
    throw error;
  }
}
