import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getAnalytics,
  getPostAnalytics,
  syncPostAnalyticsController,
  getTopPerformingPosts,
} from '../controllers/analytics.controller';

export const analyticsRoutes = Router();

analyticsRoutes.use(authMiddleware);

// Get analytics summary
analyticsRoutes.get('/', getAnalytics);

// Get top performing posts
analyticsRoutes.get('/top', getTopPerformingPosts);

// Get analytics for specific post
analyticsRoutes.get('/posts/:postId', getPostAnalytics);

// Manually sync analytics for a post
analyticsRoutes.post('/posts/:postId/sync', syncPostAnalyticsController);
