import { google } from 'googleapis';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

// Store CSRF tokens for OAuth state verification
const pendingStates = new Map<string, { userId: string; expires: number }>();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
}

export async function getAuthUrl(userId: string): Promise<string> {
  const client = getOAuth2Client();
  // Generate CSRF-safe state token
  const stateToken = crypto.randomBytes(32).toString('hex');
  pendingStates.set(stateToken, { userId, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: stateToken,
    prompt: 'consent',
  });

  return authUrl;
}

export function resolveState(stateToken: string): string {
  const entry = pendingStates.get(stateToken);
  if (!entry) {
    throw new Error('Invalid or expired OAuth state token');
  }
  if (Date.now() > entry.expires) {
    pendingStates.delete(stateToken);
    throw new Error('OAuth state token expired');
  }
  pendingStates.delete(stateToken);
  return entry.userId;
}

export async function handleCallback(code: string, userId: string) {
  const client = getOAuth2Client();
  try {
    logger.info(`Drive OAuth: exchanging code for tokens for user ${userId}`);
    const { tokens } = await client.getToken(code);
    logger.info(`Drive OAuth: tokens received, access_token: ${tokens.access_token ? 'YES' : 'NO'}, refresh_token: ${tokens.refresh_token ? 'YES' : 'NO'}`);
    client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();
    logger.info(`Drive OAuth: user info received - email: ${userInfo.email}, id: ${userInfo.id}`);

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

    const client = getOAuth2Client();
    client.setCredentials({
      refresh_token: account.refreshToken,
    });

    const { credentials } = await client.refreshAccessToken();

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

  const client = getOAuth2Client();

  // Check if token is expired
  if (account.tokenExpiry && account.tokenExpiry < new Date()) {
    await refreshAccessToken(account.id);
    const updatedAccount = await prisma.socialAccount.findUnique({
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
