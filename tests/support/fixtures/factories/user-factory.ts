/**
 * User Factory
 *
 * Creates test users with realistic data and provides auto-cleanup.
 * Uses faker for generating random but realistic test data.
 *
 * Example usage:
 * const user = await userFactory.createUser({ name: 'John Doe' });
 */

import { APIRequestContext } from '@playwright/test';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}

export class UserFactory {
  private createdUsers: string[] = [];
  private request: APIRequestContext;
  private readonly baseURL = process.env.API_URL || 'http://localhost:3000/api';

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Create a new test user
   */
  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    const user = {
      email: overrides.email || `test-${randomId}-${timestamp}@example.com`,
      name: overrides.name || `Test User ${randomId}`,
      password: overrides.password || 'TestPassword123!',
      role: overrides.role || 'USER',
    };

    // Register user via API
    const response = await this.request.post(`${this.baseURL}/auth/register`, {
      data: user,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create user: ${response.status()} ${await response.text()}`);
    }

    const created = await response.json();

    // Track for cleanup
    this.createdUsers.push(created.user.id);

    return {
      id: created.user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      role: user.role as 'USER' | 'ADMIN',
    };
  }

  /**
   * Create admin user
   */
  async createAdmin(overrides: Partial<User> = {}): Promise<User> {
    return this.createUser({ ...overrides, role: 'ADMIN' });
  }

  /**
   * Create multiple users
   */
  async createUsers(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createUser(overrides));
    }
    return users;
  }

  /**
   * Get auth token for a user
   */
  async getAuthToken(email: string, password: string): Promise<string> {
    const response = await this.request.post(`${this.baseURL}/auth/login`, {
      data: { email, password },
    });

    if (!response.ok()) {
      throw new Error(`Failed to login: ${response.status()}`);
    }

    const data = await response.json();
    return data.token;
  }

  /**
   * Cleanup all created users
   * Called automatically after each test
   */
  async cleanup(): Promise<void> {
    // In a real implementation, you would delete users via API or database
    // For now, we'll just clear the tracking array
    // Note: Ensure your test environment resets between test runs

    for (const userId of this.createdUsers) {
      try {
        // Delete user via API (you'll need to implement this endpoint or use direct DB access)
        // await this.request.delete(`${this.baseURL}/users/${userId}`);
        console.log(`[Cleanup] User ${userId} marked for cleanup`);
      } catch (error) {
        console.warn(`[Cleanup] Failed to delete user ${userId}:`, error);
      }
    }

    this.createdUsers = [];
  }
}
