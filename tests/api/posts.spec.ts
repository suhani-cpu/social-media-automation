/**
 * Posts API Tests
 *
 * Tests the posts API endpoints
 */

import { test, expect } from '../support/fixtures';

test.describe('Posts API', () => {
  test('should create a post', async ({ apiClient, userFactory, videoFactory }) => {
    // Create user and get token
    const user = await userFactory.createUser();
    const token = await userFactory.getAuthToken(user.email, user.password);
    apiClient.setAuthToken(token);

    // Upload video
    const video = await videoFactory.uploadVideo({ authToken: token });

    // Create post
    const response = await apiClient.post('/posts', {
      data: {
        videoId: video.id,
        caption: 'Test post caption',
        platforms: ['INSTAGRAM', 'FACEBOOK'],
      },
    });

    await apiClient.assertResponseOk(response);

    const data = await response.json();

    expect(data.post).toBeDefined();
    expect(data.post.caption).toBe('Test post caption');
    expect(data.post.platforms).toEqual(['INSTAGRAM', 'FACEBOOK']);
    expect(data.post.status).toBe('DRAFT');
  });

  test('should get all posts', async ({ apiClient, userFactory, postFactory, videoFactory }) => {
    // Create user and get token
    const user = await userFactory.createUser();
    const token = await userFactory.getAuthToken(user.email, user.password);
    apiClient.setAuthToken(token);

    // Create video and post
    const video = await videoFactory.uploadVideo({ authToken: token });
    await postFactory.createPost({ videoId: video.id, authToken: token });

    // Get posts
    const response = await apiClient.get('/posts');
    await apiClient.assertResponseOk(response);

    const data = await response.json();

    expect(data.posts).toBeDefined();
    expect(Array.isArray(data.posts)).toBe(true);
    expect(data.posts.length).toBeGreaterThan(0);
  });

  test('should publish a post', async ({ apiClient, userFactory, postFactory, videoFactory }) => {
    // Create user and get token
    const user = await userFactory.createUser();
    const token = await userFactory.getAuthToken(user.email, user.password);
    apiClient.setAuthToken(token);

    // Create video and post
    const video = await videoFactory.uploadAndProcessVideo({ authToken: token });
    const post = await postFactory.createPost({
      videoId: video.id,
      caption: 'Post to publish',
      authToken: token,
    });

    // Publish post
    const response = await apiClient.post(`/posts/${post.id}/publish`);
    await apiClient.assertResponseOk(response);

    const data = await response.json();

    expect(data.post.status).toBe('PUBLISHED');
  });

  test('should schedule a post', async ({ apiClient, userFactory, postFactory, videoFactory }) => {
    // Create user and get token
    const user = await userFactory.createUser();
    const token = await userFactory.getAuthToken(user.email, user.password);
    apiClient.setAuthToken(token);

    // Create video
    const video = await videoFactory.uploadAndProcessVideo({ authToken: token });

    // Schedule post for 1 hour from now
    const scheduledTime = new Date(Date.now() + 60 * 60 * 1000);

    const response = await apiClient.post('/posts', {
      data: {
        videoId: video.id,
        caption: 'Scheduled post',
        platforms: ['INSTAGRAM'],
        scheduledFor: scheduledTime.toISOString(),
      },
    });

    await apiClient.assertResponseOk(response);

    const data = await response.json();

    expect(data.post.status).toBe('SCHEDULED');
    expect(data.post.scheduledFor).toBeDefined();
  });

  test('should delete a post', async ({ apiClient, userFactory, postFactory, videoFactory }) => {
    // Create user and get token
    const user = await userFactory.createUser();
    const token = await userFactory.getAuthToken(user.email, user.password);
    apiClient.setAuthToken(token);

    // Create video and post
    const video = await videoFactory.uploadVideo({ authToken: token });
    const post = await postFactory.createPost({ videoId: video.id, authToken: token });

    // Delete post
    const response = await apiClient.delete(`/posts/${post.id}`);
    await apiClient.assertResponseOk(response);

    // Verify post is deleted
    const getResponse = await apiClient.get(`/posts/${post.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('should generate AI captions', async ({ apiClient, userFactory }) => {
    // Create user and get token
    const user = await userFactory.createUser();
    const token = await userFactory.getAuthToken(user.email, user.password);
    apiClient.setAuthToken(token);

    // Generate captions
    const response = await apiClient.post('/posts/generate-caption', {
      data: {
        context: 'A beautiful sunset video',
        language: 'English',
      },
    });

    await apiClient.assertResponseOk(response);

    const data = await response.json();

    expect(data.captions).toBeDefined();
    expect(Array.isArray(data.captions)).toBe(true);
    expect(data.captions.length).toBeGreaterThan(0);
  });
});
