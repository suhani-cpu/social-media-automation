import apiClient from './client';
import { Platform } from '../types/api';

export interface AnalyticsSummary {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
  avgEngagementRate: number;
}

export interface PlatformBreakdown {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
}

export interface TimelineEntry {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  platform: Platform;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  byPlatform: Record<Platform, PlatformBreakdown>;
  timeline: TimelineEntry[];
}

export interface PostWithAnalytics {
  id: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
  };
  platform: Platform;
  postType: string;
  caption: string;
  publishedAt: string;
  platformUrl: string | null;
  analytics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    metricsDate: string;
  };
}

export interface TopPostsResponse {
  metric: string;
  posts: PostWithAnalytics[];
}

export const analyticsApi = {
  /**
   * Get analytics summary
   */
  getSummary: async (params?: {
    startDate?: string;
    endDate?: string;
    platform?: Platform;
  }): Promise<AnalyticsResponse> => {
    const response = await apiClient.get('/analytics', { params });
    return response.data;
  },

  /**
   * Get post-specific analytics
   */
  getPostAnalytics: async (postId: string): Promise<any> => {
    const response = await apiClient.get(`/analytics/posts/${postId}`);
    return response.data;
  },

  /**
   * Trigger analytics sync for a post
   */
  syncPost: async (postId: string): Promise<{ message: string; postId: string }> => {
    const response = await apiClient.post(`/analytics/posts/${postId}/sync`);
    return response.data;
  },

  /**
   * Get top performing posts
   */
  getTopPosts: async (params?: {
    limit?: number;
    metric?: 'views' | 'likes' | 'comments' | 'shares' | 'engagementRate';
  }): Promise<TopPostsResponse> => {
    const response = await apiClient.get('/analytics/top', { params });
    return response.data;
  },
};
