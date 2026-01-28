// Main Facebook service exports
export { publishToFacebook, getFacebookVideoInsights } from './client';
export { uploadVideoToFacebook, updateFacebookVideo, deleteFacebookVideo } from './upload';
export { getFacebookInsights, getFacebookPageInsights, getFacebookVideoDetails } from './analytics';
export {
  getFacebookAuthUrl,
  exchangeFacebookCode,
  exchangeForLongLivedToken,
  getFacebookPages,
  getPageAccessToken,
  refreshFacebookToken,
} from '../../auth/facebook-oauth';

// Types
export type { FacebookUploadOptions, FacebookUploadResult } from './upload';
export type { FacebookAnalytics } from './analytics';
