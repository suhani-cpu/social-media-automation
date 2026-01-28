import apiClient from './client';
import { Video } from '../types/api';

export interface UploadVideoData {
  video: File;
  title: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const videosApi = {
  /**
   * Upload a video
   */
  upload: async (
    data: UploadVideoData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ message: string; video: Video }> => {
    const formData = new FormData();
    formData.append('video', data.video);
    formData.append('title', data.title);

    const response = await apiClient.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });

    return response.data;
  },

  /**
   * Get all videos
   */
  getAll: async (): Promise<{ videos: Video[] }> => {
    const response = await apiClient.get('/videos');
    return response.data;
  },

  /**
   * Get video by ID
   */
  getById: async (id: string): Promise<{ video: Video }> => {
    const response = await apiClient.get(`/videos/${id}`);
    return response.data;
  },

  /**
   * Delete video
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/videos/${id}`);
    return response.data;
  },
};
