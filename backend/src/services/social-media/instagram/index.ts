// Main Instagram service exports
export { publishToInstagram, getInstagramInsights } from './client';
export { uploadVideoToInstagram, uploadPhotoToInstagram, deleteInstagramMedia } from './upload';
export { getInstagramMediaInsights, getInstagramAccountInsights, getInstagramMediaDetails } from './analytics';
export {
  getInstagramAuthUrl,
  exchangeInstagramCode,
  exchangeForLongLivedToken,
  getInstagramAccounts,
  refreshInstagramToken,
} from '../../auth/instagram-oauth';

// Types
export type { InstagramUploadOptions, InstagramUploadResult } from './upload';
export type { InstagramAnalytics } from './analytics';
