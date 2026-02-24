import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { captionLimiter } from '../middleware/rate-limit.middleware';
import {
  createPost,
  getPosts,
  publishPost,
  getScheduledSummary,
  reschedulePostController,
  generateCaptionController,
} from '../controllers/post.controller';

export const postRoutes = Router();

postRoutes.use(authMiddleware);

postRoutes.post('/generate-caption', captionLimiter, generateCaptionController);
postRoutes.post('/', createPost);
postRoutes.get('/', getPosts);
postRoutes.post('/:id/publish', publishPost);
postRoutes.get('/scheduled/summary', getScheduledSummary);
postRoutes.put('/:id/reschedule', reschedulePostController);
