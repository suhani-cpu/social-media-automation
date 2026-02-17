/**
 * API Client Helper
 *
 * Wrapper around Playwright's APIRequestContext with:
 * - Automatic auth token injection
 * - Response validation
 * - Error handling
 */

import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiClient {
  private request: APIRequestContext;
  private readonly baseURL = process.env.API_URL || 'http://localhost:3000/api';
  private authToken?: string;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Get headers with auth token
   */
  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make GET request
   */
  async get(endpoint: string, options: { headers?: Record<string, string> } = {}): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(options.headers),
    });
  }

  /**
   * Make POST request
   */
  async post(
    endpoint: string,
    options: { data?: any; headers?: Record<string, string> } = {}
  ): Promise<APIResponse> {
    return this.request.post(`${this.baseURL}${endpoint}`, {
      data: options.data,
      headers: this.getHeaders(options.headers),
    });
  }

  /**
   * Make PUT request
   */
  async put(
    endpoint: string,
    options: { data?: any; headers?: Record<string, string> } = {}
  ): Promise<APIResponse> {
    return this.request.put(`${this.baseURL}${endpoint}`, {
      data: options.data,
      headers: this.getHeaders(options.headers),
    });
  }

  /**
   * Make PATCH request
   */
  async patch(
    endpoint: string,
    options: { data?: any; headers?: Record<string, string> } = {}
  ): Promise<APIResponse> {
    return this.request.patch(`${this.baseURL}${endpoint}`, {
      data: options.data,
      headers: this.getHeaders(options.headers),
    });
  }

  /**
   * Make DELETE request
   */
  async delete(endpoint: string, options: { headers?: Record<string, string> } = {}): Promise<APIResponse> {
    return this.request.delete(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(options.headers),
    });
  }

  /**
   * Validate response status
   */
  async assertResponseOk(response: APIResponse, message?: string): Promise<void> {
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(message || `API request failed: ${response.status()} ${body}`);
    }
  }

  /**
   * Get JSON response with validation
   */
  async getJSON<T = any>(response: APIResponse): Promise<T> {
    await this.assertResponseOk(response);
    return response.json();
  }
}
