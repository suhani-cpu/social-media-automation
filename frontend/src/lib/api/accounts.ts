import apiClient from './client';
import { SocialAccount } from '../types/api';

export const accountsApi = {
  /**
   * Get all connected social accounts
   */
  getAll: async (): Promise<{ accounts: SocialAccount[] }> => {
    const response = await apiClient.get('/accounts');
    return response.data;
  },

  /**
   * Get account by ID
   */
  getById: async (id: string): Promise<{ account: SocialAccount }> => {
    const response = await apiClient.get(`/accounts/${id}`);
    return response.data;
  },

  /**
   * Disconnect account
   */
  disconnect: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/accounts/${id}`);
    return response.data;
  },

  /**
   * Get YouTube OAuth authorization URL
   */
  getYouTubeAuthUrl: async (): Promise<{ authUrl: string; message: string }> => {
    const response = await apiClient.get('/oauth/youtube/authorize');
    return response.data;
  },

  /**
   * Get Facebook OAuth authorization URL
   */
  getFacebookAuthUrl: async (): Promise<{ authUrl: string; message: string }> => {
    const response = await apiClient.get('/oauth/facebook/authorize');
    return response.data;
  },

  /**
   * Get Instagram OAuth authorization URL
   */
  getInstagramAuthUrl: async (): Promise<{ authUrl: string; message: string }> => {
    const response = await apiClient.get('/oauth/instagram/authorize');
    return response.data;
  },

  /**
   * Get Google Drive OAuth authorization URL
   */
  getDriveAuthUrl: async (): Promise<{ authUrl: string; message: string }> => {
    const response = await apiClient.get('/drive/auth');
    return response.data;
  },
};
