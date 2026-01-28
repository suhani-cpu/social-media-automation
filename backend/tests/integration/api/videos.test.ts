import request from 'supertest';
import { app } from '../../../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import path from 'path';

jest.mock('jsonwebtoken');

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Videos API Integration Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockUserId = 'user-id';

  beforeEach(() => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: mockUserId });
  });

  describe('POST /api/videos/upload', () => {
    it('should upload video and return 201', async () => {
      const mockVideo = {
        id: 'video-id',
        title: 'Test Video',
        userId: mockUserId,
        status: 'PENDING',
        language: 'ENGLISH',
        rawVideoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.video.create as jest.Mock).mockResolvedValue(mockVideo);

      const response = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('title', 'Test Video')
        .field('language', 'ENGLISH')
        .attach('video', Buffer.from('mock-video-data'), 'test-video.mp4')
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Video');
      expect(response.body.status).toBe('PENDING');
    });

    it('should return 401 if no token provided', async () => {
      await request(app)
        .post('/api/videos/upload')
        .field('title', 'Test Video')
        .attach('video', Buffer.from('mock-video-data'), 'test-video.mp4')
        .expect(401);
    });

    it('should return 400 if no file uploaded', async () => {
      await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('title', 'Test Video')
        .expect(400);
    });

    it('should return 400 if title is missing', async () => {
      await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('video', Buffer.from('mock-video-data'), 'test-video.mp4')
        .expect(400);
    });
  });

  describe('GET /api/videos', () => {
    it('should return list of videos for authenticated user', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          title: 'Video 1',
          userId: mockUserId,
          status: 'READY',
          createdAt: new Date(),
        },
        {
          id: 'video-2',
          title: 'Video 2',
          userId: mockUserId,
          status: 'PROCESSING',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.video.findMany as jest.Mock).mockResolvedValue(mockVideos);

      const response = await request(app)
        .get('/api/videos')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe('video-1');
    });

    it('should filter videos by status', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          title: 'Video 1',
          status: 'READY',
        },
      ];

      (mockPrisma.video.findMany as jest.Mock).mockResolvedValue(mockVideos);

      const response = await request(app)
        .get('/api/videos?status=READY')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'READY',
          }),
        })
      );
    });

    it('should return 401 if no token provided', async () => {
      await request(app).get('/api/videos').expect(401);
    });
  });

  describe('GET /api/videos/:id', () => {
    it('should return video by id', async () => {
      const mockVideo = {
        id: 'video-id',
        title: 'Test Video',
        userId: mockUserId,
        status: 'READY',
      };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);

      const response = await request(app)
        .get('/api/videos/video-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('video-id');
      expect(response.body.title).toBe('Test Video');
    });

    it('should return 404 if video not found', async () => {
      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/videos/nonexistent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 403 if video belongs to different user', async () => {
      const mockVideo = {
        id: 'video-id',
        userId: 'different-user-id',
      };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);

      await request(app)
        .get('/api/videos/video-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });
  });

  describe('DELETE /api/videos/:id', () => {
    it('should delete video successfully', async () => {
      const mockVideo = {
        id: 'video-id',
        userId: mockUserId,
        title: 'Test Video',
      };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);
      (mockPrisma.video.delete as jest.Mock).mockResolvedValue(mockVideo);

      const response = await request(app)
        .delete('/api/videos/video-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.message).toBe('Video deleted successfully');
      expect(mockPrisma.video.delete).toHaveBeenCalledWith({
        where: { id: 'video-id' },
      });
    });

    it('should return 404 if video not found', async () => {
      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .delete('/api/videos/nonexistent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });

    it('should return 403 if video belongs to different user', async () => {
      const mockVideo = {
        id: 'video-id',
        userId: 'different-user-id',
      };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);

      await request(app)
        .delete('/api/videos/video-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });
  });
});
