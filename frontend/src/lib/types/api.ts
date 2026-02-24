// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'ADMIN' | 'USER';
  brandName?: string;
  industry?: string;
  logoUrl?: string;
  onboardingComplete?: boolean;
  defaultLanguage?: string;
  defaultPrivacy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Video types
export type VideoStatus = 'PENDING' | 'DOWNLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface Video {
  id: string;
  userId: string;
  title: string;
  rawVideoUrl: string | null;
  originalUrl?: string;
  instagramReelUrl: string | null;
  instagramFeedUrl: string | null;
  youtubeShortsUrl: string | null;
  youtubeVideoUrl: string | null;
  youtubeSquareUrl: string | null;
  facebookSquareUrl: string | null;
  facebookLandscapeUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  fileSize: number | null;
  size?: number;
  status: VideoStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// Post types
export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type Platform =
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'GOOGLE_DRIVE';
export type PostType = 'FEED' | 'REEL' | 'STORY' | 'VIDEO' | 'SHORT';
export type Language = 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI' | 'RAJASTHANI' | 'BHOJPURI';

export interface Post {
  id: string;
  userId: string;
  videoId: string;
  accountId: string;
  caption: string;
  language: Language;
  hashtags: string[];
  platform: Platform;
  postType: PostType;
  status: PostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  platformPostId: string | null;
  platformUrl: string | null;
  errorMessage: string | null;
  metadata?: { privacyStatus?: string; [key: string]: any };
  createdAt: string;
  updatedAt: string;
  video?: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
  };
  account?: {
    id: string;
    platform: Platform;
    username: string;
  };
}

export interface CreatePostRequest {
  videoId: string;
  accountId: string;
  caption: string;
  language: Language;
  hashtags?: string[];
  platform: Platform;
  postType: PostType;
  scheduledFor?: string;
  metadata?: { privacyStatus?: string };
}

export interface PublishProgress {
  stage: 'downloading' | 'converting' | 'uploading' | 'done' | 'error';
  percent: number;
  message: string;
}

// Social Account types
export type AccountStatus = 'ACTIVE' | 'EXPIRED' | 'DISCONNECTED';

export interface SocialAccount {
  id: string;
  userId: string;
  platform: Platform;
  username: string;
  accountId: string;
  status: AccountStatus;
  tokenExpiry: string | null;
  createdAt: string;
  updatedAt: string;
}

// Caption types
export interface CaptionVariation {
  caption: string;
  hashtags: string[];
}

export interface GenerateCaptionResponse {
  variations: CaptionVariation[];
}

// Analytics types
export interface Analytics {
  id: string;
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  metricsDate: string;
  createdAt: string;
}

export interface BestTimesSuggestion {
  suggestion: string;
  bestHours: Array<{
    hour: number;
    avgViews: number;
    avgEngagement: number;
    postsAnalyzed: number;
  }>;
  bestDays: Array<{
    day: string;
    dayIndex: number;
    avgViews: number;
    avgEngagement: number;
    postsAnalyzed: number;
  }>;
  postsAnalyzed: number;
  defaultSuggestions: string[];
  hasEnoughData: boolean;
}

export interface PerformanceInsights {
  platforms: Array<{
    platform: string;
    avgViews: number;
    avgEngagement: number;
  }>;
  postTypes: Array<{
    type: string;
    avgViews: number;
    avgEngagement: number;
  }>;
  insights: string[];
  totalPublished: number;
}

// API Response wrappers
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
