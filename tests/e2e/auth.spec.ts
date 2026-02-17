/**
 * Authentication E2E Tests
 *
 * Tests user registration, login, logout flows
 */

import { test, expect } from '../support/fixtures';

test.describe('Authentication', () => {
  test('should register a new user', async ({ page, userFactory }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `newuser-${timestamp}@example.com`,
      name: `New User ${timestamp}`,
      password: 'SecurePassword123!',
    };

    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    await page.fill('[data-testid="name-input"]', testUser.name);
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.fill('[data-testid="confirm-password-input"]', testUser.password);

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user menu is visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page, userFactory }) => {
    // Create test user
    const user = await userFactory.createUser();

    // Navigate to login page
    await page.goto('/login');

    // Fill login form
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');

    // Submit form
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid credentials/i);
  });

  test('should logout successfully', async ({ authenticatedPage: page }) => {
    // User is already logged in via fixture

    // Verify on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Click user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);

    // User menu should not be visible
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
