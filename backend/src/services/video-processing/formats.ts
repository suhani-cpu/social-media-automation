/**
 * Platform-specific video format specifications
 */

export interface VideoFormat {
  name: string;
  resolution: string;
  width: number;
  height: number;
  aspectRatio: string;
  videoBitrate: string;
  audioBitrate: string;
  fps: number;
  codec: string;
  audioCodec: string;
  format: string;
  maxDuration?: number; // in seconds, undefined means no limit
  description: string;
}

export const FORMATS: Record<string, VideoFormat> = {
  INSTAGRAM_REEL: {
    name: 'Instagram Reel',
    resolution: '1080x1920',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    videoBitrate: '5000k',
    audioBitrate: '128k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    maxDuration: 90,
    description: 'Vertical video for Instagram Reels (max 90 seconds)',
  },
  INSTAGRAM_FEED: {
    name: 'Instagram Feed',
    resolution: '1080x1080',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    videoBitrate: '5000k',
    audioBitrate: '128k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    description: 'Square video for Instagram Feed (unlimited duration)',
  },
  YOUTUBE_SHORTS: {
    name: 'YouTube Shorts',
    resolution: '1080x1920',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    videoBitrate: '8000k',
    audioBitrate: '192k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    maxDuration: 60,
    description: 'Vertical video for YouTube Shorts (max 60 seconds)',
  },
  YOUTUBE_VIDEO: {
    name: 'YouTube Video',
    resolution: '1920x1080',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    videoBitrate: '8000k',
    audioBitrate: '192k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    description: 'Landscape video for YouTube regular videos',
  },
  YOUTUBE_SQUARE: {
    name: 'YouTube Square',
    resolution: '1080x1080',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    videoBitrate: '8000k',
    audioBitrate: '192k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    description: 'Square video for YouTube (1:1 format)',
  },
  FACEBOOK_SQUARE: {
    name: 'Facebook Square',
    resolution: '1080x1080',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    videoBitrate: '5000k',
    audioBitrate: '128k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    description: 'Square video for Facebook Feed',
  },
  FACEBOOK_LANDSCAPE: {
    name: 'Facebook Landscape',
    resolution: '1920x1080',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    videoBitrate: '5000k',
    audioBitrate: '128k',
    fps: 30,
    codec: 'libx264',
    audioCodec: 'aac',
    format: 'mp4',
    description: 'Landscape video for Facebook',
  },
};

/**
 * Get format configuration by name
 */
export function getFormat(formatName: string): VideoFormat {
  const format = FORMATS[formatName];
  if (!format) {
    throw new Error(`Unknown format: ${formatName}`);
  }
  return format;
}

/**
 * Get all format names
 */
export function getAllFormatNames(): string[] {
  return Object.keys(FORMATS);
}

/**
 * Video field mappings in database
 */
export const VIDEO_URL_FIELDS: Record<string, string> = {
  INSTAGRAM_REEL: 'instagramReelUrl',
  INSTAGRAM_FEED: 'instagramFeedUrl',
  YOUTUBE_SHORTS: 'youtubeShortsUrl',
  YOUTUBE_VIDEO: 'youtubeVideoUrl',
  YOUTUBE_SQUARE: 'youtubeSquareUrl',
  FACEBOOK_SQUARE: 'facebookSquareUrl',
  FACEBOOK_LANDSCAPE: 'facebookLandscapeUrl',
};
