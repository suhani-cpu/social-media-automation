import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadLimiter } from '../middleware/rate-limit.middleware';
import multer from 'multer';
import { uploadVideo, getVideos, getVideo } from '../controllers/video.controller';

const upload = multer({
  dest: '/tmp/uploads',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

export const videoRoutes = Router();

videoRoutes.use(authMiddleware);

videoRoutes.post('/upload', uploadLimiter, upload.single('video'), uploadVideo);
videoRoutes.get('/', getVideos);
videoRoutes.get('/:id', getVideo);
