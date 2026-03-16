import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface StageContent {
  contentType: string;
  title: string;
  description: string;
  slug: string;
  dialect: string;
  language: string;
  duration: number;
  format: string;
  status: string;
  thumbnailURL: string;
  oldContentId: number;
  createdAt: string;
  updatedAt: string;
  releaseDate: string;
  createdBy: string;
}

export interface StageContentResponse {
  items: StageContent[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class StageOttService {
  private readonly logger = new Logger(StageOttService.name);
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('STAGE_OTT_API_URL') ||
      'https://stageapi.stage.in/nest/cms';
    this.authToken = this.configService.get<string>('STAGE_OTT_TOKEN') || '';
  }

  private getHeaders(dialect?: string) {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      lang: 'en',
      os: 'other',
      platform: 'web',
      ...(dialect ? { dialect } : {}),
    };
  }

  /**
   * List content from Stage OTT CMS.
   */
  async listContent(options: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: string;
    dialect?: string;
  }): Promise<StageContentResponse> {
    const {
      page = 1,
      perPage = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dialect,
    } = options;

    const params: Record<string, any> = {
      page,
      perPage,
      sortBy,
      sortOrder,
    };
    if (dialect) params.dialect = dialect;

    try {
      const response = await axios.get(`${this.baseUrl}/content/all`, {
        headers: this.getHeaders(dialect),
        params,
      });

      const data = response.data as StageContentResponse;
      // Clean S3 pre-signed URLs so thumbnails don't expire
      data.items = data.items.map((item) => ({
        ...item,
        thumbnailURL: this.cleanS3Url(item.thumbnailURL) || item.thumbnailURL,
      }));
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch Stage OTT content: ${error.message}`);
      throw new BadRequestException(
        `Failed to fetch Stage OTT content: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Import a Stage OTT content item into the video library.
   */
  async importContent(userId: string, stageContent: {
    oldContentId: number;
    title: string;
    description?: string;
    thumbnailURL?: string;
    dialect?: string;
    duration?: number;
    slug?: string;
    contentType?: string;
    format?: string;
  }) {
    const { oldContentId, title, description, thumbnailURL, dialect, duration, slug, contentType, format } = stageContent;

    if (!oldContentId || !title) {
      throw new BadRequestException('Content ID and title are required');
    }

    // Check for duplicate import
    const existing = await this.prisma.video.findFirst({
      where: {
        userId,
        stageOttId: String(oldContentId),
      },
    });

    if (existing) {
      return {
        message: 'Content already imported from Stage OTT',
        video: existing,
        alreadyExists: true,
      };
    }

    // Map dialect codes to language enum values
    const dialectToLanguage: Record<string, string> = {
      hin: 'HINDI',
      har: 'HARYANVI',
      raj: 'RAJASTHANI',
      bho: 'BHOJPURI',
      guj: 'HINGLISH',
      eng: 'ENGLISH',
    };

    const cleanThumbnail = this.cleanS3Url(thumbnailURL);

    const video = await this.prisma.video.create({
      data: {
        userId,
        title: title.trim(),
        description: description || null,
        sourceType: 'STAGE_OTT',
        status: 'READY',
        thumbnailUrl: cleanThumbnail,
        duration: duration ? Math.round(duration) : null,
        language: dialectToLanguage[dialect || ''] || 'HINGLISH',
        stageOttId: String(oldContentId),
        stageOttData: {
          oldContentId,
          slug,
          contentType,
          dialect,
          format,
          thumbnailURL,
          importedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Stage OTT content imported: ${video.id} (${title}, contentId: ${oldContentId})`,
    );

    return {
      message: 'Content imported from Stage OTT',
      video,
      alreadyExists: false,
    };
  }

  /**
   * Strip pre-signed query params from S3 URLs so they don't expire.
   * The Stage OTT S3 bucket is publicly accessible.
   */
  private cleanS3Url(url: string | undefined | null): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('s3.') && parsed.hostname.includes('amazonaws.com')) {
        return `${parsed.origin}${parsed.pathname}`;
      }
      return url;
    } catch {
      return url;
    }
  }

  /**
   * Bulk import multiple content items from Stage OTT.
   */
  async importMultiple(userId: string, items: Array<{
    oldContentId: number;
    title: string;
    description?: string;
    thumbnailURL?: string;
    dialect?: string;
    duration?: number;
    slug?: string;
    contentType?: string;
    format?: string;
  }>) {
    if (!items.length) {
      throw new BadRequestException('No items to import');
    }

    if (items.length > 20) {
      throw new BadRequestException('Maximum 20 items can be imported at once');
    }

    const results: Array<{
      success: boolean;
      contentId: number;
      videoId?: string;
      title?: string;
      alreadyExists?: boolean;
      error?: string;
    }> = [];

    for (const item of items) {
      try {
        const result = await this.importContent(userId, item);
        results.push({
          success: true,
          contentId: item.oldContentId,
          videoId: result.video.id,
          title: item.title,
          alreadyExists: result.alreadyExists,
        });
      } catch (error: any) {
        results.push({
          success: false,
          contentId: item.oldContentId,
          title: item.title,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      message: `Imported ${successCount} of ${items.length} items from Stage OTT`,
      results,
    };
  }
}
