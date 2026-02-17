import { Router, Request, Response } from 'express';
import fs from 'fs';
import { clipVideo, deleteTempFile } from '../services/video-cutting/ffmpeg.service';
import { applyFraming } from '../services/video-cutting/framing.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

function isValidHttpsUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

interface ClipRequest {
  videoUrl: string;
  startSeconds: number;
  endSeconds: number;
  framing?: {
    aspectRatio?: string;
    paddingColor?: string;
    topCaption?: string;
    bottomCaption?: string;
    captionFontSize?: number;
    captionColor?: string;
    captionFont?: string;
    topCaptionX?: string;
    topCaptionY?: string;
    bottomCaptionX?: string;
    bottomCaptionY?: string;
    logoX?: number;
    logoY?: number;
    logoScale?: number;
    includeLogo?: boolean;
  };
}

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const {
    videoUrl,
    startSeconds,
    endSeconds,
    framing
  }: ClipRequest = req.body;

  // Validation
  if (!videoUrl || startSeconds === undefined || endSeconds === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidHttpsUrl(videoUrl)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const start = Number(startSeconds);
  const end = Number(endSeconds);

  if (isNaN(start) || start < 0) {
    return res.status(400).json({ error: 'Start time must be >= 0' });
  }

  if (isNaN(end) || end <= start) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  const duration = end - start;
  if (duration > 600) {
    return res.status(400).json({ error: 'Max clip duration is 10 minutes' });
  }

  let clipPath: string | null = null;
  let framedPath: string | null = null;

  try {
    // Step 1: Cut the clip
    clipPath = await clipVideo(videoUrl, start, end);

    // Step 2: Apply framing if options provided
    let outputPath = clipPath;

    if (framing && (
      framing.aspectRatio !== 'original' ||
      framing.topCaption ||
      framing.bottomCaption ||
      framing.includeLogo
    )) {
      framedPath = await applyFraming(clipPath, {
        aspectRatio: framing.aspectRatio || 'original',
        paddingColor: framing.paddingColor || '#000000',
        topCaption: framing.topCaption || '',
        bottomCaption: framing.bottomCaption || '',
        captionFontSize: framing.captionFontSize || 32,
        captionColor: framing.captionColor || 'white',
        captionFont: framing.captionFont || 'sans-serif',
        topCaptionX: framing.topCaptionX || '50',
        topCaptionY: framing.topCaptionY || '10',
        bottomCaptionX: framing.bottomCaptionX || '50',
        bottomCaptionY: framing.bottomCaptionY || '90',
        logoX: framing.logoX || 85,
        logoY: framing.logoY || 15,
        logoScale: framing.logoScale || 0.15
      });

      outputPath = framedPath;

      // Delete the intermediate clip file
      deleteTempFile(clipPath);
      clipPath = null;
    }

    // Set response headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');

    // Stream the file
    const fileStream = fs.createReadStream(outputPath);

    fileStream.pipe(res);

    // Cleanup after response ends
    const cleanup = () => {
      if (clipPath) deleteTempFile(clipPath);
      if (framedPath) deleteTempFile(framedPath);
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

  } catch (err: any) {
    // Cleanup on error
    if (clipPath) deleteTempFile(clipPath);
    if (framedPath) deleteTempFile(framedPath);

    console.error('Processing error:', err);

    if (err.message.includes('timeout')) {
      return res.status(504).json({ error: 'Processing timeout' });
    }

    return res.status(500).json({
      error: 'Processing failed',
      details: err.message
    });
  }
});

export { router as clipRoutes };
