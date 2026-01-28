// Main YouTube service exports
export { publishToYouTube, getYouTubeInsights } from './client';
export { uploadVideoToYouTube, updateYouTubeVideo, deleteYouTubeVideo } from './upload';
export { getYouTubeAnalytics, getYouTubeChannelInfo } from './analytics';
export {
  createYouTubeOAuth2Client,
  getYouTubeAuthUrl,
  exchangeYouTubeCode,
  getYouTubeAuthClient,
  refreshYouTubeToken,
} from '../../auth/youtube-oauth';

// Types
export type { YouTubeUploadOptions, YouTubeUploadResult } from './upload';
export type { YouTubeAnalytics } from './analytics';
