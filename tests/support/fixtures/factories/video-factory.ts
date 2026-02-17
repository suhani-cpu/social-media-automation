/**
 * Video Factory
 *
 * Creates test videos by uploading sample video files.
 * Provides auto-cleanup to delete uploaded videos after tests.
 *
 * Example usage:
 * const video = await videoFactory.uploadVideo({ title: 'My Test Video' });
 */

import { APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface Video {
  id: string;
  title: string;
  filename: string;
  status: string;
  urls?: Record<string, string>;
}

export class VideoFactory {
  private createdVideos: string[] = [];
  private request: APIRequestContext;
  private readonly baseURL = process.env.API_URL || 'http://localhost:3000/api';
  private readonly testVideoPath = process.env.TEST_VIDEO_PATH || path.join(__dirname, '../../fixtures/test-video.mp4');

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Upload a test video
   */
  async uploadVideo(overrides: Partial<{ title: string; authToken: string }> = {}): Promise<Video> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    const title = overrides.title || `Test Video ${randomId}`;
    const authToken = overrides.authToken;

    // Check if test video file exists
    if (!fs.existsSync(this.testVideoPath)) {
      throw new Error(`Test video file not found at: ${this.testVideoPath}`);
    }

    // Read video file
    const videoBuffer = fs.readFileSync(this.testVideoPath);

    // Upload via multipart/form-data
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await this.request.post(`${this.baseURL}/videos/upload`, {
      headers,
      multipart: {
        video: {
          name: `test-${randomId}-${timestamp}.mp4`,
          mimeType: 'video/mp4',
          buffer: videoBuffer,
        },
        title,
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to upload video: ${response.status()} ${await response.text()}`);
    }

    const created = await response.json();

    // Track for cleanup
    this.createdVideos.push(created.video.id);

    return {
      id: created.video.id,
      title: created.video.title,
      filename: created.video.filename,
      status: created.video.status,
      urls: created.video.urls,
    };
  }

  /**
   * Wait for video processing to complete
   */
  async waitForProcessing(videoId: string, authToken?: string, timeout: number = 120000): Promise<Video> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await this.request.get(`${this.baseURL}/videos/${videoId}`, { headers });

      if (response.ok()) {
        const video = await response.json();

        if (video.status === 'READY') {
          return video;
        }

        if (video.status === 'FAILED') {
          throw new Error(`Video processing failed for video ${videoId}`);
        }
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Video processing timeout for video ${videoId}`);
  }

  /**
   * Upload video and wait for processing
   */
  async uploadAndProcessVideo(overrides: Partial<{ title: string; authToken: string }> = {}): Promise<Video> {
    const video = await this.uploadVideo(overrides);
    return this.waitForProcessing(video.id, overrides.authToken);
  }

  /**
   * Cleanup all created videos
   * Called automatically after each test
   */
  async cleanup(): Promise<void> {
    for (const videoId of this.createdVideos) {
      try {
        // Delete video via API
        await this.request.delete(`${this.baseURL}/videos/${videoId}`);
        console.log(`[Cleanup] Video ${videoId} deleted`);
      } catch (error) {
        console.warn(`[Cleanup] Failed to delete video ${videoId}:`, error);
      }
    }

    this.createdVideos = [];
  }
}
