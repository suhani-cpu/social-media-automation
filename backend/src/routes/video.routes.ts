import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadLimiter } from '../middleware/rate-limit.middleware';
import multer from 'multer';
import { uploadVideo, getVideos, getVideo, deleteVideo } from '../controllers/video.controller';

const upload = multer({
  dest: '/tmp/uploads',
  limits: {
    fileSize: 1000 * 1024 * 1024, // 1GB (1000MB)
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Allow only video files
    const allowedMimes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, MKV videos are allowed.'));
    }
  },
});

export const videoRoutes = Router();

videoRoutes.use(authMiddleware);

// Handle multer errors
const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large! Maximum size is 1GB. / फ़ाइल बहुत बड़ी है! अधिकतम साइज़ 1GB है।',
        code: 'FILE_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files! Upload one video at a time. / बहुत सारी फ़ाइलें! एक बार में एक वीडियो अपलोड करें।',
        code: 'TOO_MANY_FILES',
      });
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      message: 'Invalid file type! Only video files (MP4, MOV, AVI, MKV) are allowed. / गलत फ़ाइल टाइप! केवल वीडियो फ़ाइलें (MP4, MOV, AVI, MKV) allowed हैं।',
      code: 'INVALID_FILE_TYPE',
    });
  }
  next(err);
};

videoRoutes.post('/upload', uploadLimiter, upload.single('video'), handleUploadError, uploadVideo);
videoRoutes.get('/', getVideos);
videoRoutes.get('/:id', getVideo);
videoRoutes.delete('/:id', deleteVideo);
