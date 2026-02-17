/**
 * Authentication Helper
 *
 * Provides utilities for authentication in tests:
 * - Login/logout
 * - Token management
 * - Session persistence
 */

import { Page, APIRequestContext } from '@playwright/test';

export class AuthHelper {
  private page: Page;
  private request: APIRequestContext;
  private readonly baseURL = process.env.BASE_URL || 'http://localhost:3001';
  private readonly apiURL = process.env.API_URL || 'http://localhost:3000/api';

  constructor(page: Page, request: APIRequestContext) {
    this.page = page;
    this.request = request;
  }

  /**
   * Login via UI
   */
  async login(email: string, password: string): Promise<void> {
    await this.page.goto(`${this.baseURL}/login`);

    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 });
  }

  /**
   * Login via API (faster for setup)
   */
  async loginViaAPI(email: string, password: string): Promise<string> {
    const response = await this.request.post(`${this.apiURL}/auth/login`, {
      data: { email, password },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }

    const data = await response.json();
    return data.token;
  }

  /**
   * Login as test user (from environment)
   */
  async loginAsTestUser(): Promise<void> {
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    await this.login(email, password);
  }

  /**
   * Login as admin user (from environment)
   */
  async loginAsAdmin(): Promise<void> {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
    await this.login(email, password);
  }

  /**
   * Logout via UI
   */
  async logout(): Promise<void> {
    try {
      // Click user menu
      await this.page.click('[data-testid="user-menu"]');

      // Click logout button
      await this.page.click('[data-testid="logout-button"]');

      // Wait for redirect to login
      await this.page.waitForURL('**/login**', { timeout: 5000 });
    } catch (error) {
      // If logout fails, just navigate to login page
      console.warn('Logout failed, navigating to login page');
      await this.page.goto(`${this.baseURL}/login`);
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get auth token from cookies or local storage
   */
  async getAuthToken(): Promise<string | null> {
    // Try to get token from local storage
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    });

    if (token) {
      return token;
    }

    // Try to get token from cookies
    const cookies = await this.page.context().cookies();
    const authCookie = cookies.find((c) => c.name === 'authToken' || c.name === 'token');

    return authCookie?.value || null;
  }

  /**
   * Set auth token in browser storage
   */
  async setAuthToken(token: string): Promise<void> {
    await this.page.evaluate((t) => {
      localStorage.setItem('authToken', t);
    }, token);
  }
}
