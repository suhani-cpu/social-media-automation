/**
 * Post Factory
 *
 * Creates test social media posts with auto-cleanup.
 *
 * Example usage:
 * const post = await postFactory.createPost({ caption: 'Test post', platforms: ['INSTAGRAM'] });
 */

import { APIRequestContext } from '@playwright/test';

export interface Post {
  id: string;
  caption: string;
  platforms: string[];
  status: string;
  scheduledFor?: Date;
  videoId: string;
}

export class PostFactory {
  private createdPosts: string[] = [];
  private request: APIRequestContext;
  private readonly baseURL = process.env.API_URL || 'http://localhost:3000/api';

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Create a new social media post
   */
  async createPost(
    data: {
      videoId: string;
      caption?: string;
      platforms?: string[];
      scheduledFor?: Date;
      authToken?: string;
    }
  ): Promise<Post> {
    const timestamp = Date.now();

    const postData = {
      videoId: data.videoId,
      caption: data.caption || `Test post ${timestamp}`,
      platforms: data.platforms || ['INSTAGRAM'],
      scheduledFor: data.scheduledFor,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (data.authToken) {
      headers['Authorization'] = `Bearer ${data.authToken}`;
    }

    const response = await this.request.post(`${this.baseURL}/posts`, {
      headers,
      data: postData,
    });

    if (!response.ok()) {
      throw new Error(`Failed to create post: ${response.status()} ${await response.text()}`);
    }

    const created = await response.json();

    // Track for cleanup
    this.createdPosts.push(created.post.id);

    return {
      id: created.post.id,
      caption: created.post.caption,
      platforms: created.post.platforms,
      status: created.post.status,
      scheduledFor: created.post.scheduledFor,
      videoId: created.post.videoId,
    };
  }

  /**
   * Publish a post immediately
   */
  async publishPost(postId: string, authToken?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await this.request.post(`${this.baseURL}/posts/${postId}/publish`, { headers });

    if (!response.ok()) {
      throw new Error(`Failed to publish post: ${response.status()} ${await response.text()}`);
    }
  }

  /**
   * Create and publish a post
   */
  async createAndPublishPost(
    data: {
      videoId: string;
      caption?: string;
      platforms?: string[];
      authToken?: string;
    }
  ): Promise<Post> {
    const post = await this.createPost(data);
    await this.publishPost(post.id, data.authToken);
    return post;
  }

  /**
   * Cleanup all created posts
   * Called automatically after each test
   */
  async cleanup(): Promise<void> {
    for (const postId of this.createdPosts) {
      try {
        // Delete post via API
        await this.request.delete(`${this.baseURL}/posts/${postId}`);
        console.log(`[Cleanup] Post ${postId} deleted`);
      } catch (error) {
        console.warn(`[Cleanup] Failed to delete post ${postId}:`, error);
      }
    }

    this.createdPosts = [];
  }
}
