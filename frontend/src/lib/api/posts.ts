import apiClient from './client';
import { Post, CreatePostRequest, Language, Platform, PublishProgress } from '../types/api';

export interface CaptionVariation {
  caption: string;
  hashtags: string[];
}

export interface GenerateCaptionRequest {
  videoTitle: string;
  language: Language;
  platform: Platform;
}

export const postsApi = {
  generateCaption: async (
    data: GenerateCaptionRequest
  ): Promise<{ variations: CaptionVariation[] }> => {
    const response = await apiClient.post('/posts/generate-caption', data);
    return response.data;
  },

  create: async (data: CreatePostRequest): Promise<{ message: string; post: Post }> => {
    const response = await apiClient.post('/posts', data);
    return response.data;
  },

  getAll: async (): Promise<{ posts: Post[] }> => {
    const response = await apiClient.get('/posts');
    return response.data;
  },

  getById: async (id: string): Promise<{ post: Post }> => {
    const response = await apiClient.get(`/posts/${id}`);
    return response.data;
  },

  publish: async (id: string): Promise<{ message: string; postId: string }> => {
    const response = await apiClient.post(`/posts/${id}/publish`);
    return response.data;
  },

  getPublishProgress: async (id: string): Promise<PublishProgress> => {
    const response = await apiClient.get(`/posts/${id}/publish-progress`);
    return response.data;
  },

  reschedule: async (
    id: string,
    scheduledFor: string
  ): Promise<{ message: string; scheduledFor: Date }> => {
    const response = await apiClient.put(`/posts/${id}/reschedule`, { scheduledFor });
    return response.data;
  },

  batchPublish: async (
    postIds: string[]
  ): Promise<{
    message: string;
    total: number;
    results: Array<{ postId: string; status: string }>;
  }> => {
    const response = await apiClient.post('/posts/batch-publish', { postIds });
    return response.data;
  },

  retry: async (id: string): Promise<{ message: string; postId: string }> => {
    const response = await apiClient.post(`/posts/${id}/retry`);
    return response.data;
  },

  reset: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/posts/${id}/reset`);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/posts/${id}`);
    return response.data;
  },
};

export const analyticsApi = {
  getSummary: async (startDate?: string, endDate?: string, platform?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (platform) params.set('platform', platform);
    const response = await apiClient.get(`/analytics?${params.toString()}`);
    return response.data;
  },

  getTopPerforming: async (limit = 10, metric = 'engagementRate') => {
    const response = await apiClient.get(`/analytics/top?limit=${limit}&metric=${metric}`);
    return response.data;
  },

  getBestTimes: async (platform?: string) => {
    const response = await apiClient.get(
      `/analytics/best-times${platform ? `?platform=${platform}` : ''}`
    );
    return response.data;
  },

  getInsights: async () => {
    const response = await apiClient.get('/analytics/insights');
    return response.data;
  },
};

export const authApi = {
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: {
    name?: string;
    brandName?: string;
    industry?: string;
    defaultLanguage?: string;
    defaultPrivacy?: string;
  }) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  completeOnboarding: async (data: {
    brandName?: string;
    industry?: string;
    defaultLanguage?: string;
  }) => {
    const response = await apiClient.put('/auth/onboarding', data);
    return response.data;
  },
};
