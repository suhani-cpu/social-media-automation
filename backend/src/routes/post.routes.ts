import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createPost,
  getPosts,
  publishPost,
  getScheduledSummary,
  reschedulePostController,
} from '../controllers/post.controller';

export const postRoutes = Router();

postRoutes.use(authMiddleware);

postRoutes.post('/', createPost);
postRoutes.get('/', getPosts);
postRoutes.post('/:id/publish', publishPost);
postRoutes.get('/scheduled/summary', getScheduledSummary);
postRoutes.put('/:id/reschedule', reschedulePostController);
