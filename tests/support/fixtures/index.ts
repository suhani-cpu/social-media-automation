/**
 * Custom Test Fixtures for Social Media Automation Platform
 *
 * This file extends Playwright's base test with custom fixtures including:
 * - Authenticated user contexts
 * - Data factories (users, videos, posts)
 * - API clients with auth tokens
 * - Database cleanup utilities
 *
 * Usage:
 * import { test, expect } from './support/fixtures';
 *
 * test('my test', async ({ authenticatedPage, userFactory }) => {
 *   // Test code here
 * });
 */

import { test as base, expect } from '@playwright/test';
import { UserFactory } from './factories/user-factory';
import { VideoFactory } from './factories/video-factory';
import { PostFactory } from './factories/post-factory';
import { AuthHelper } from '../helpers/auth-helper';
import { ApiClient } from '../helpers/api-client';

/**
 * Custom fixture types
 */
type TestFixtures = {
  // Factory fixtures - auto-cleanup after test
  userFactory: UserFactory;
  videoFactory: VideoFactory;
  postFactory: PostFactory;

  // Helper fixtures
  authHelper: AuthHelper;
  apiClient: ApiClient;

  // Authenticated page fixture
  authenticatedPage: typeof base.prototype.page;
  adminPage: typeof base.prototype.page;
};

/**
 * Extend base test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * User Factory - Creates test users with auto-cleanup
   */
  userFactory: async ({ request }, use) => {
    const factory = new UserFactory(request);
    await use(factory);
    await factory.cleanup(); // Auto-cleanup all created users
  },

  /**
   * Video Factory - Creates test videos with auto-cleanup
   */
  videoFactory: async ({ request }, use) => {
    const factory = new VideoFactory(request);
    await use(factory);
    await factory.cleanup(); // Auto-cleanup all uploaded videos
  },

  /**
   * Post Factory - Creates test posts with auto-cleanup
   */
  postFactory: async ({ request }, use) => {
    const factory = new PostFactory(request);
    await use(factory);
    await factory.cleanup(); // Auto-cleanup all created posts
  },

  /**
   * Auth Helper - Authentication utilities
   */
  authHelper: async ({ page, request }, use) => {
    const helper = new AuthHelper(page, request);
    await use(helper);
  },

  /**
   * API Client - Authenticated API request wrapper
   */
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
  },

  /**
   * Authenticated Page - Pre-authenticated as regular user
   */
  authenticatedPage: async ({ page, authHelper }, use) => {
    // Login as test user
    await authHelper.loginAsTestUser();
    await use(page);
    await authHelper.logout();
  },

  /**
   * Admin Page - Pre-authenticated as admin user
   */
  adminPage: async ({ page, authHelper }, use) => {
    // Login as admin user
    await authHelper.loginAsAdmin();
    await use(page);
    await authHelper.logout();
  },
});

/**
 * Re-export expect for convenience
 */
export { expect };
