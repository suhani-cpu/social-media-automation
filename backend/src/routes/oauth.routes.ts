import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getYouTubeAuthUrlController,
  youtubeCallbackController,
  getFacebookAuthUrlController,
  facebookCallbackController,
  getInstagramAuthUrlController,
  instagramCallbackController,
} from '../controllers/oauth.controller';

export const oauthRoutes = Router();

// YouTube OAuth
oauthRoutes.get('/youtube/authorize', authMiddleware, getYouTubeAuthUrlController);
oauthRoutes.get('/youtube/callback', youtubeCallbackController); // No auth middleware - state validation handles security

// Facebook OAuth
oauthRoutes.get('/facebook/authorize', authMiddleware, getFacebookAuthUrlController);
oauthRoutes.get('/facebook/callback', facebookCallbackController); // No auth middleware - state validation handles security

// Instagram OAuth
oauthRoutes.get('/instagram/authorize', authMiddleware, getInstagramAuthUrlController);
oauthRoutes.get('/instagram/callback', instagramCallbackController); // No auth middleware - state validation handles security
