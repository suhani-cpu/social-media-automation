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

const CHUNK_SIZE = 3.5 * 1024 * 1024; // 3.5MB per chunk (under Vercel's 4.5MB body limit)

export const videosApi = {
  /**
   * Upload a video — uses chunked upload for files > 3.5MB
   */
  upload: async (
    data: UploadVideoData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ message: string; video: Video }> => {
    const file = data.video;

    // Small files: direct upload
    if (file.size <= CHUNK_SIZE) {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', data.title);

      const response = await apiClient.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            });
          }
        },
      });
      return response.data;
    }

    // Large files: chunked upload
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Step 1: Initialize upload session
    const initRes = await apiClient.post('/videos/upload/init', {
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      title: data.title,
    });
    const { uploadId } = initRes.data;

    // Step 2: Upload chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkForm = new FormData();
      chunkForm.append('chunk', chunk, `chunk-${i}`);
      chunkForm.append('uploadId', uploadId);
      chunkForm.append('chunkIndex', String(i));

      await apiClient.post('/videos/upload/chunk', chunkForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      if (onProgress) {
        const loaded = end;
        onProgress({
          loaded,
          total: file.size,
          percentage: Math.round((loaded * 100) / file.size),
        });
      }
    }

    // Step 3: Complete upload
    const completeRes = await apiClient.post('/videos/upload/complete', {
      uploadId,
      title: data.title,
    });

    return completeRes.data;
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
