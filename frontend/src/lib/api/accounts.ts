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
};
