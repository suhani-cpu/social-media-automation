/**
 * Video Upload E2E Tests
 *
 * Tests video upload, processing, and management
 */

import { test, expect } from '../support/fixtures';
import * as path from 'path';

test.describe('Video Upload', () => {
  test('should upload a video successfully', async ({ authenticatedPage: page, authHelper }) => {
    // Navigate to upload page
    await page.goto('/dashboard/videos/upload');

    // Get test video path
    const testVideoPath = path.join(__dirname, '../support/fixtures/test-video.mp4');

    // Upload video file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testVideoPath);

    // Fill video title
    await page.fill('[data-testid="video-title-input"]', 'Test Video Upload');

    // Submit upload
    await page.click('[data-testid="upload-button"]');

    // Should show upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Wait for upload to complete (with timeout)
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 60000 });

    // Should redirect to videos list
    await expect(page).toHaveURL(/\/dashboard\/videos/);

    // Verify video appears in list
    await expect(page.locator('text=Test Video Upload')).toBeVisible();
  });

  test('should show error for unsupported file type', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/videos/upload');

    // Try to upload a non-video file
    const textFilePath = path.join(__dirname, '../support/fixtures/test-file.txt');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(textFilePath);

    // Should show error message
    await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-type-error"]')).toContainText(/unsupported file type/i);
  });

  test('should show error for oversized video', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/videos/upload');

    // Try to upload a file larger than max size
    // This test assumes you have a large test file or can mock the file size check

    // Upload large video
    const largeVideoPath = process.env.TEST_LARGE_VIDEO_PATH;

    if (!largeVideoPath) {
      test.skip();
      return;
    }

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeVideoPath);

    // Should show error message
    await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText(/file too large/i);
  });

  test('should display uploaded videos in list', async ({ authenticatedPage: page, videoFactory, authHelper }) => {
    // Get auth token
    const token = await authHelper.getAuthToken();

    // Upload test video via API
    const video = await videoFactory.uploadVideo({ title: 'API Uploaded Video', authToken: token! });

    // Navigate to videos page
    await page.goto('/dashboard/videos');

    // Should display the uploaded video
    await expect(page.locator(`[data-testid="video-${video.id}"]`)).toBeVisible();
    await expect(page.locator(`text=${video.title}`)).toBeVisible();
  });

  test('should delete a video', async ({ authenticatedPage: page, videoFactory, authHelper }) => {
    const token = await authHelper.getAuthToken();

    // Upload test video
    const video = await videoFactory.uploadVideo({ title: 'Video to Delete', authToken: token! });

    // Navigate to videos page
    await page.goto('/dashboard/videos');

    // Click delete button
    await page.click(`[data-testid="delete-video-${video.id}"]`);

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Video should be removed from list
    await expect(page.locator(`[data-testid="video-${video.id}"]`)).not.toBeVisible();
  });
});
