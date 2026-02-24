import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      post: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      analytics: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('analytics-sync'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getBestTimes', () => {
    it('should return default suggestions when not enough data', async () => {
      prisma.post.findMany.mockResolvedValue([]);

      const result = await service.getBestTimes('user1', 'YOUTUBE');

      expect(result).toHaveProperty('hasEnoughData', false);
      expect(result).toHaveProperty('suggestion');
      expect(result).toHaveProperty('defaultSuggestions');
      expect(result.defaultSuggestions.length).toBeGreaterThan(0);
    });

    it('should analyze publish times when enough data exists', async () => {
      const mockPosts = Array.from({ length: 6 }, (_, i) => ({
        id: `p${i}`,
        publishedAt: new Date(2026, 1, 20, 10 + i, 0, 0), // Different hours
        platform: 'YOUTUBE',
        analytics: [
          {
            views: 100 + i * 50,
            likes: 10 + i * 5,
            comments: 2 + i,
            shares: 1,
            engagement: 3.5 + i * 0.5,
          },
        ],
      }));

      prisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getBestTimes('user1');

      expect(result).toHaveProperty('hasEnoughData', true);
      expect(result).toHaveProperty('bestHours');
      expect(result.bestHours.length).toBeGreaterThan(0);
      // Best hours should have hour and avgEngagement
      expect(result.bestHours[0]).toHaveProperty('hour');
      expect(result.bestHours[0]).toHaveProperty('avgEngagement');
    });
  });

  describe('getInsights', () => {
    it('should return empty insights when no published posts', async () => {
      prisma.post.findMany.mockResolvedValue([]);

      const result = await service.getInsights('user1');

      expect(result).toHaveProperty('totalPublished', 0);
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('platforms');
    });
  });
});
