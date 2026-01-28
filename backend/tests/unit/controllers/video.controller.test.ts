import { Request, Response } from 'express';
import { uploadVideo, getVideos, getVideo, deleteVideo } from '../../../src/controllers/video.controller';
import { PrismaClient } from '@prisma/client';

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('Video Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      body: {},
      user: { id: 'user-id' },
      file: undefined,
      params: {},
      query: {},
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
  });

  describe('uploadVideo', () => {
    it('should upload video successfully', async () => {
      const mockFile = {
        filename: 'test-video.mp4',
        path: '/tmp/test-video.mp4',
        size: 1024000,
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      mockRequest.file = mockFile;
      mockRequest.body = {
        title: 'Test Video',
        language: 'ENGLISH',
      };

      const mockVideo = {
        id: 'video-id',
        title: 'Test Video',
        userId: 'user-id',
        status: 'PENDING',
        language: 'ENGLISH',
        rawVideoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.video.create as jest.Mock).mockResolvedValue(mockVideo);

      await uploadVideo(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.video.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Video',
          userId: 'user-id',
          language: 'ENGLISH',
          status: 'PENDING',
        }),
      });
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(mockVideo);
    });

    it('should return 400 if no file uploaded', async () => {
      mockRequest.file = undefined;
      mockRequest.body = { title: 'Test Video' };

      await uploadVideo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'No video file uploaded',
      });
    });

    it('should return 400 if title is missing', async () => {
      const mockFile = {
        filename: 'test-video.mp4',
        path: '/tmp/test-video.mp4',
      } as Express.Multer.File;

      mockRequest.file = mockFile;
      mockRequest.body = {};

      await uploadVideo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getVideos', () => {
    it('should return list of videos for authenticated user', async () => {
      const mockVideos = [
        {
          id: 'video-1',
          title: 'Video 1',
          userId: 'user-id',
          status: 'READY',
        },
        {
          id: 'video-2',
          title: 'Video 2',
          userId: 'user-id',
          status: 'PROCESSING',
        },
      ];

      mockRequest.query = { limit: '10', offset: '0' };

      (mockPrisma.video.findMany as jest.Mock).mockResolvedValue(mockVideos);

      await getVideos(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(responseJson).toHaveBeenCalledWith(mockVideos);
    });

    it('should filter videos by status', async () => {
      mockRequest.query = { status: 'READY' };

      await getVideos(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.video.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
          status: 'READY',
        },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getVideo', () => {
    it('should return video by id', async () => {
      const mockVideo = {
        id: 'video-id',
        title: 'Test Video',
        userId: 'user-id',
        status: 'READY',
      };

      mockRequest.params = { id: 'video-id' };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);

      await getVideo(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: 'video-id' },
      });
      expect(responseJson).toHaveBeenCalledWith(mockVideo);
    });

    it('should return 404 if video not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(null);

      await getVideo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Video not found',
      });
    });

    it('should return 403 if video belongs to different user', async () => {
      const mockVideo = {
        id: 'video-id',
        userId: 'different-user-id',
      };

      mockRequest.params = { id: 'video-id' };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);

      await getVideo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'Unauthorized access to video',
      });
    });
  });

  describe('deleteVideo', () => {
    it('should delete video successfully', async () => {
      const mockVideo = {
        id: 'video-id',
        userId: 'user-id',
        title: 'Test Video',
      };

      mockRequest.params = { id: 'video-id' };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(mockVideo);
      (mockPrisma.video.delete as jest.Mock).mockResolvedValue(mockVideo);

      await deleteVideo(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.video.delete).toHaveBeenCalledWith({
        where: { id: 'video-id' },
      });
      expect(responseJson).toHaveBeenCalledWith({
        message: 'Video deleted successfully',
      });
    });

    it('should return 404 if video not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };

      (mockPrisma.video.findUnique as jest.Mock).mockResolvedValue(null);

      await deleteVideo(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });
});
