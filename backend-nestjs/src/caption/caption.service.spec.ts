import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CaptionService, CaptionRequest } from './caption.service';

describe('CaptionService', () => {
  let service: CaptionService;

  describe('without API key (template fallback)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CaptionService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
        ],
      }).compile();

      service = module.get<CaptionService>(CaptionService);
    });

    it('should generate 3 caption variations using templates', async () => {
      const request: CaptionRequest = {
        videoTitle: 'My Test Video',
        platform: 'YOUTUBE',
        language: 'ENGLISH',
        tone: ['engaging'],
      };

      const result = await service.generate(request);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('caption');
      expect(result[0]).toHaveProperty('hashtags');
      expect(result[0]).toHaveProperty('characterCount');
      expect(result[0].caption.length).toBeGreaterThan(0);
      expect(result[0].hashtags.length).toBeGreaterThan(0);
    });

    it('should include video title in captions', async () => {
      const request: CaptionRequest = {
        videoTitle: 'Amazing Cooking Tutorial',
        platform: 'INSTAGRAM',
        language: 'ENGLISH',
        tone: ['fun'],
      };

      const result = await service.generate(request);

      // At least one variation should reference the video title
      const hasTitle = result.some(
        (v) =>
          v.caption.toLowerCase().includes('amazing') ||
          v.caption.toLowerCase().includes('cooking'),
      );
      expect(hasTitle).toBe(true);
    });

    it('should generate captions for HINGLISH language', async () => {
      const request: CaptionRequest = {
        videoTitle: 'Festival Video',
        platform: 'INSTAGRAM',
        language: 'HINGLISH',
        tone: ['engaging'],
      };

      const result = await service.generate(request);
      expect(result).toHaveLength(3);
    });

    it('should generate captions for RAJASTHANI language', async () => {
      const request: CaptionRequest = {
        videoTitle: 'Rajasthani Dance',
        platform: 'YOUTUBE',
        language: 'RAJASTHANI',
        tone: ['engaging'],
      };

      const result = await service.generate(request);
      expect(result).toHaveLength(3);
    });

    it('should generate captions for BHOJPURI language', async () => {
      const request: CaptionRequest = {
        videoTitle: 'Bhojpuri Song',
        platform: 'FACEBOOK',
        language: 'BHOJPURI',
        tone: ['fun'],
      };

      const result = await service.generate(request);
      expect(result).toHaveLength(3);
    });

    it('should respect platform character limits', async () => {
      const request: CaptionRequest = {
        videoTitle: 'Test Video',
        platform: 'INSTAGRAM',
        language: 'ENGLISH',
        tone: ['engaging'],
      };

      const result = await service.generate(request);

      // Instagram limit is 2200
      for (const variation of result) {
        expect(variation.characterCount).toBeLessThanOrEqual(2200);
      }
    });

    it('should generate hashtags starting with #', async () => {
      const request: CaptionRequest = {
        videoTitle: 'Test',
        platform: 'YOUTUBE',
        language: 'ENGLISH',
        tone: ['engaging'],
      };

      const result = await service.generate(request);

      for (const variation of result) {
        for (const tag of variation.hashtags) {
          expect(tag).toMatch(/^#/);
        }
      }
    });
  });
});
