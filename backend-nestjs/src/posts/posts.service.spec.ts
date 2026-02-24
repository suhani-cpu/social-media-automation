import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { YouTubeService } from '../social-media/youtube/youtube.service';
import { InstagramService } from '../social-media/instagram/instagram.service';
import { FacebookService } from '../social-media/facebook/facebook.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock ioredis to avoid real connection
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockRejectedValue(new Error('mock')),
    setex: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
});

describe('PostsService', () => {
  let service: PostsService;
  let prisma: any;
  let youtubeService: any;
  let instagramService: any;
  let facebookService: any;

  beforeEach(async () => {
    prisma = {
      post: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      video: { findFirst: jest.fn() },
      socialAccount: { findFirst: jest.fn() },
    };

    youtubeService = {
      publishToYouTube: jest.fn(),
    };

    instagramService = {
      publishToInstagram: jest.fn(),
    };

    facebookService = {
      publishToFacebook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: YouTubeService, useValue: youtubeService },
        { provide: InstagramService, useValue: instagramService },
        { provide: FacebookService, useValue: facebookService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  describe('create', () => {
    it('should create a DRAFT post when no scheduledFor', async () => {
      prisma.video.findFirst.mockResolvedValue({ id: 'v1', userId: 'u1' });
      prisma.socialAccount.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' });
      prisma.post.create.mockResolvedValue({ id: 'p1', status: 'DRAFT' });

      const result = await service.create('u1', {
        videoId: 'v1',
        accountId: 'a1',
        caption: 'Test caption',
        language: 'ENGLISH',
        platform: 'YOUTUBE',
        postType: 'VIDEO',
      });

      expect(result.message).toBe('Post created successfully');
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            platform: 'YOUTUBE',
          }),
        }),
      );
    });

    it('should create a SCHEDULED post when scheduledFor is provided', async () => {
      prisma.video.findFirst.mockResolvedValue({ id: 'v1', userId: 'u1' });
      prisma.socialAccount.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' });
      prisma.post.create.mockResolvedValue({ id: 'p1', status: 'SCHEDULED' });

      const result = await service.create('u1', {
        videoId: 'v1',
        accountId: 'a1',
        caption: 'Test caption',
        language: 'HINDI',
        platform: 'INSTAGRAM',
        postType: 'REEL',
        scheduledFor: '2026-03-01T10:00:00Z',
      });

      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        }),
      );
    });

    it('should throw NotFoundException when video not found', async () => {
      prisma.video.findFirst.mockResolvedValue(null);

      await expect(
        service.create('u1', {
          videoId: 'bad-id',
          accountId: 'a1',
          caption: 'Test',
          language: 'ENGLISH',
          platform: 'YOUTUBE',
          postType: 'VIDEO',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.video.findFirst.mockResolvedValue({ id: 'v1', userId: 'u1' });
      prisma.socialAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.create('u1', {
          videoId: 'v1',
          accountId: 'bad-id',
          caption: 'Test',
          language: 'ENGLISH',
          platform: 'YOUTUBE',
          postType: 'VIDEO',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should return early if post is already PUBLISHING', async () => {
      prisma.post.findFirst.mockResolvedValue({
        id: 'p1',
        status: 'PUBLISHING',
        video: {},
        account: {},
      });

      const result = await service.publish('u1', 'p1');
      expect(result.message).toBe('Post is already being published');
    });

    it('should return early if post is already PUBLISHED', async () => {
      prisma.post.findFirst.mockResolvedValue({
        id: 'p1',
        status: 'PUBLISHED',
        video: {},
        account: {},
      });

      const result = await service.publish('u1', 'p1');
      expect(result.message).toBe('Post is already published');
    });

    it('should throw NotFoundException when post not found', async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.publish('u1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should set status to PUBLISHING and return immediately', async () => {
      prisma.post.findFirst.mockResolvedValue({
        id: 'p1',
        status: 'DRAFT',
        platform: 'YOUTUBE',
        video: { id: 'v1', youtubeVideoUrl: 'http://example.com/video.mp4' },
        account: { id: 'a1' },
      });
      prisma.post.update.mockResolvedValue({});
      youtubeService.publishToYouTube.mockResolvedValue({ id: 'yt1', url: 'https://youtube.com/watch?v=yt1' });

      const result = await service.publish('u1', 'p1');

      expect(result.message).toBe('Publishing started');
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'PUBLISHING' },
      });
    });
  });

  describe('getPublishProgress', () => {
    it('should return default done state when no active publish', async () => {
      const progress = await service.getPublishProgress('nonexistent');
      expect(progress.stage).toBe('done');
      expect(progress.percent).toBe(100);
    });
  });

  describe('batchPublish', () => {
    it('should throw when postIds is empty', async () => {
      await expect(service.batchPublish('u1', [])).rejects.toThrow(BadRequestException);
    });

    it('should throw when no publishable posts found', async () => {
      prisma.post.findMany.mockResolvedValue([]);

      await expect(service.batchPublish('u1', ['p1'])).rejects.toThrow(BadRequestException);
    });
  });

  describe('retryPublish', () => {
    it('should throw when failed post not found', async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.retryPublish('u1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete post successfully', async () => {
      prisma.post.findFirst.mockResolvedValue({ id: 'p1', userId: 'u1' });
      prisma.post.delete.mockResolvedValue({});

      const result = await service.delete('u1', 'p1');
      expect(result.message).toBe('Post deleted successfully');
    });

    it('should throw when post not found', async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.delete('u1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
