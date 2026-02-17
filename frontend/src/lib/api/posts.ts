import apiClient from './client';
import { Post, CreatePostRequest, Language, Platform } from '../types/api';

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
  /**
   * Generate caption variations
   */
  generateCaption: async (
    data: GenerateCaptionRequest
  ): Promise<{ variations: CaptionVariation[] }> => {
    const response = await apiClient.post('/posts/generate-caption', data);
    return response.data;
  },

  /**
   * Create a post
   */
  create: async (data: CreatePostRequest): Promise<{ message: string; post: Post }> => {
    const response = await apiClient.post('/posts', data);
    return response.data;
  },

  /**
   * Get all posts
   */
  getAll: async (): Promise<{ posts: Post[] }> => {
    const response = await apiClient.get('/posts');
    return response.data;
  },

  /**
   * Get post by ID
   */
  getById: async (id: string): Promise<{ post: Post }> => {
    const response = await apiClient.get(`/posts/${id}`);
    return response.data;
  },

  /**
   * Publish a post
   */
  publish: async (id: string): Promise<{ message: string; post: Post }> => {
    const response = await apiClient.post(`/posts/${id}/publish`);
    return response.data;
  },

  /**
   * Reschedule a post
   */
  reschedule: async (
    id: string,
    scheduledFor: string
  ): Promise<{ message: string; scheduledFor: Date }> => {
    const response = await apiClient.put(`/posts/${id}/reschedule`, { scheduledFor });
    return response.data;
  },

  /**
   * Delete a post
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/posts/${id}`);
    return response.data;
  },
};
