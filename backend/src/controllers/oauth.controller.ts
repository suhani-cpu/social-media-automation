import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';

// YouTube OAuth
import {
  getYouTubeAuthUrl,
  exchangeYouTubeCode,
} from '../services/auth/youtube-oauth';

// Facebook OAuth
import {
  getFacebookAuthUrl,
  exchangeFacebookCode,
  exchangeForLongLivedToken,
  getFacebookPages,
} from '../services/auth/facebook-oauth';

// Instagram OAuth
import {
  getInstagramAuthUrl,
  exchangeInstagramCode,
  exchangeForLongLivedToken as exchangeForLongLivedTokenInstagram,
  getInstagramAccounts,
} from '../services/auth/instagram-oauth';

import { google } from 'googleapis';
import { config } from '../config/env';

/**
 * YouTube OAuth - Step 1: Generate authorization URL
 */
export const getYouTubeAuthUrlController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Generate state to prevent CSRF
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = getYouTubeAuthUrl(state);

    logger.info('YouTube auth URL generated', { userId });

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize YouTube access',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * YouTube OAuth - Step 2: Handle callback and exchange code for tokens
 */
export const youtubeCallbackController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error('YouTube OAuth error', { error });
      return res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=youtube_auth_failed`);
    }

    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'Authorization code is required');
    }

    // Verify state to prevent CSRF
    if (!state || typeof state !== 'string') {
      throw new AppError(400, 'Invalid state parameter');
    }

    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      throw new AppError(400, 'Invalid state parameter');
    }

    const { userId, timestamp } = stateData;

    // Verify state is not too old (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new AppError(400, 'Authorization request expired');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    logger.info('Exchanging YouTube authorization code', { userId });

    // Exchange code for tokens
    const tokens = await exchangeYouTubeCode(code);

    // Get channel information
    const oauth2Client = new google.auth.OAuth2(
      config.YOUTUBE_CLIENT_ID,
      config.YOUTUBE_CLIENT_SECRET,
      config.YOUTUBE_REDIRECT_URI
    );

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
    if (!channel) {
      throw new AppError(404, 'No YouTube channel found for this account');
    }

    const channelId = channel.id!;
    const channelTitle = channel.snippet?.title || 'Unknown Channel';

    // Check if account already exists
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: 'YOUTUBE',
        accountId: channelId,
      },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.expiryDate,
          status: 'ACTIVE',
          metadata: {
            channelTitle,
            subscriberCount: channel.statistics?.subscriberCount,
            videoCount: channel.statistics?.videoCount,
          },
        },
      });

      logger.info('YouTube account updated', { userId, channelId });
    } else {
      // Create new account
      await prisma.socialAccount.create({
        data: {
          userId,
          platform: 'YOUTUBE',
          accountId: channelId,
          username: channelTitle,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.expiryDate,
          status: 'ACTIVE',
          metadata: {
            channelTitle,
            subscriberCount: channel.statistics?.subscriberCount,
            videoCount: channel.statistics?.videoCount,
          },
        },
      });

      logger.info('YouTube account connected', { userId, channelId });
    }

    // Redirect back to frontend
    res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?success=youtube_connected`);
  } catch (error) {
    logger.error('YouTube callback error:', error);
    res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=youtube_connection_failed`);
  }
};

/**
 * Facebook OAuth - Step 1: Generate authorization URL
 */
export const getFacebookAuthUrlController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Generate state to prevent CSRF
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = getFacebookAuthUrl(state);

    logger.info('Facebook auth URL generated', { userId });

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Facebook access',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Facebook OAuth - Step 2: Handle callback and exchange code for tokens
 */
export const facebookCallbackController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error('Facebook OAuth error', { error });
      return res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=facebook_auth_failed`);
    }

    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'Authorization code is required');
    }

    // Verify state to prevent CSRF
    if (!state || typeof state !== 'string') {
      throw new AppError(400, 'Invalid state parameter');
    }

    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      throw new AppError(400, 'Invalid state parameter');
    }

    const { userId, timestamp } = stateData;

    // Verify state is not too old (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new AppError(400, 'Authorization request expired');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    logger.info('Exchanging Facebook authorization code', { userId });

    // Exchange code for short-lived token
    const { accessToken: shortLivedToken } = await exchangeFacebookCode(code);

    // Exchange for long-lived token (60 days)
    const { accessToken, expiryDate } = await exchangeForLongLivedToken(shortLivedToken);

    // Get user's Facebook Pages
    const pages = await getFacebookPages(accessToken);

    if (pages.length === 0) {
      logger.warn('No Facebook pages found', { userId });
      return res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=no_facebook_pages`);
    }

    // Save all pages (user can choose which to use later)
    let connectedCount = 0;
    for (const page of pages) {
      const existingAccount = await prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: 'FACEBOOK',
          accountId: page.id,
        },
      });

      if (existingAccount) {
        // Update existing page
        await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: page.accessToken, // Page-specific token
            tokenExpiry: expiryDate,
            status: 'ACTIVE',
            metadata: {
              pageName: page.name,
              category: page.category,
            },
          },
        });
      } else {
        // Create new page
        await prisma.socialAccount.create({
          data: {
            userId,
            platform: 'FACEBOOK',
            accountId: page.id,
            username: page.name,
            accessToken: page.accessToken, // Page-specific token
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

    logger.info('Facebook pages connected', { userId, pageCount: connectedCount });

    // Redirect back to frontend
    res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?success=facebook_connected&pages=${connectedCount}`);
  } catch (error) {
    logger.error('Facebook callback error:', error);
    res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=facebook_connection_failed`);
  }
};

/**
 * Instagram OAuth - Step 1: Generate authorization URL
 */
export const getInstagramAuthUrlController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Generate state to prevent CSRF
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = getInstagramAuthUrl(state);

    logger.info('Instagram auth URL generated', { userId });

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize Instagram access',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Instagram OAuth - Step 2: Handle callback and exchange code for tokens
 */
export const instagramCallbackController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      logger.error('Instagram OAuth error', { error });
      return res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=instagram_auth_failed`);
    }

    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'Authorization code is required');
    }

    // Verify state to prevent CSRF
    if (!state || typeof state !== 'string') {
      throw new AppError(400, 'Invalid state parameter');
    }

    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      throw new AppError(400, 'Invalid state parameter');
    }

    const { userId, timestamp } = stateData;

    // Verify state is not too old (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new AppError(400, 'Authorization request expired');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    logger.info('Exchanging Instagram authorization code', { userId });

    // Exchange code for short-lived token
    const { accessToken: shortLivedToken } = await exchangeInstagramCode(code);

    // Exchange for long-lived token (60 days)
    const { accessToken, expiryDate } = await exchangeForLongLivedTokenInstagram(shortLivedToken);

    // Get Instagram Business accounts
    const instagramAccounts = await getInstagramAccounts(accessToken);

    if (instagramAccounts.length === 0) {
      logger.warn('No Instagram Business accounts found', { userId });
      return res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=no_instagram_accounts`);
    }

    // Save all Instagram accounts
    let connectedCount = 0;
    for (const igAccount of instagramAccounts) {
      const existingAccount = await prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: 'INSTAGRAM',
          accountId: igAccount.id,
        },
      });

      if (existingAccount) {
        // Update existing account
        await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: igAccount.pageAccessToken, // Use page token for Instagram API
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
        // Create new account
        await prisma.socialAccount.create({
          data: {
            userId,
            platform: 'INSTAGRAM',
            accountId: igAccount.id,
            username: igAccount.username,
            accessToken: igAccount.pageAccessToken, // Use page token for Instagram API
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

    logger.info('Instagram accounts connected', { userId, accountCount: connectedCount });

    // Redirect back to frontend
    res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?success=instagram_connected&accounts=${connectedCount}`);
  } catch (error) {
    logger.error('Instagram callback error:', error);
    res.redirect(`${config.FRONTEND_URL}/dashboard/accounts?error=instagram_connection_failed`);
  }
};
