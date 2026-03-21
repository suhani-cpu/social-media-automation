import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs/promises';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SheetVideoData {
  creativeName: string;
  description: string;
  headlines: string;
  metaStatic: string;
  googleStatic: string;
  videoWith1rsCTA: string;
  videoWithWatchNow: string;
  video16_9: string;
  video1_1: string;
  video9_16: string;
}

export interface ParsedVideo {
  title: string;
  description: string;
  headlines: string;
  driveLinks: string[];
  youtubeLinks: {
    landscape?: string; // 16:9
    square?: string; // 1:1
    vertical?: string; // 9:16
  };
}

@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Import videos from a public Google Sheet, attempt Drive / YouTube ingestion,
   * and auto-create Instagram posts for each imported video.
   */
  async importFromSheet(userId: string, sheetUrl: string) {
    if (!sheetUrl) {
      throw new BadRequestException('Sheet URL is required');
    }

    this.logger.log(`Starting sheet import for user ${userId}`);

    // Fetch and parse sheet data
    const sheetData = await this.fetchSheetData(sheetUrl);
    const parsedVideos = this.parseVideos(sheetData);

    this.logger.log(`Found ${parsedVideos.length} videos to import`);

    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const video of parsedVideos) {
      try {
        this.logger.log(`Processing video: ${video.title}`);

        let videoRecord: any = null;

        // -- Try Drive links first -----------------------------------------
        if (video.driveLinks.length > 0) {
          for (const driveLink of video.driveLinks) {
            const fileId = this.extractDriveFileId(driveLink);
            if (fileId) {
              try {
                // Attempt to get the Drive account for this user
                const driveAccount = await this.prisma.socialAccount.findFirst({
                  where: {
                    userId,
                    platform: 'GOOGLE_DRIVE',
                    status: 'ACTIVE',
                  },
                });

                if (!driveAccount) {
                  this.logger.warn(
                    'No active Google Drive account for user, skipping Drive link',
                  );
                  continue;
                }

                // Download via googleapis
                const { google } = await import('googleapis');
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({
                  access_token: driveAccount.accessToken,
                  refresh_token: driveAccount.refreshToken || undefined,
                });
                const drive = google.drive({ version: 'v3', auth: oauth2Client });

                // Get file metadata
                const metaRes = await drive.files.get({
                  fileId,
                  fields: 'id, name, mimeType, size',
                });
                const fileMeta = metaRes.data;

                if (
                  fileMeta.mimeType &&
                  fileMeta.mimeType.startsWith('video/')
                ) {
                  // Download file
                  const tempDir = '/tmp/sheet-imports';
                  await fs.mkdir(tempDir, { recursive: true });
                  const tempFilePath = path.join(
                    tempDir,
                    `${Date.now()}-${fileMeta.name}`,
                  );

                  const fileRes = await drive.files.get(
                    { fileId, alt: 'media' },
                    { responseType: 'stream' },
                  );

                  const fsSync = await import('fs');
                  const dest = fsSync.createWriteStream(tempFilePath);

                  await new Promise<void>((resolve, reject) => {
                    (fileRes.data as any)
                      .on('end', () => resolve())
                      .on('error', (err: Error) => reject(err))
                      .pipe(dest);
                  });

                  const stats = await fs.stat(tempFilePath);

                  videoRecord = await this.prisma.video.create({
                    data: {
                      userId,
                      title: video.title,
                      description: video.description,
                      sourceType: 'MANUAL',
                      status: 'READY',
                      rawVideoUrl: tempFilePath,
                      instagramReelUrl: tempFilePath,
                      fileSize: BigInt(stats.size),
                      metadata: {
                        source: 'google_sheets',
                        driveFileId: fileId,
                        driveFileName: fileMeta.name,
                        headlines: video.headlines,
                        importedAt: new Date().toISOString(),
                        sheetUrl,
                      },
                    },
                  });

                  this.logger.log(
                    `Video imported from Drive: ${videoRecord.id}`,
                  );
                  break; // Successfully imported, move to next video
                }
              } catch (error: any) {
                this.logger.error(
                  `Error importing from Drive link ${driveLink}: ${error.message}`,
                );
              }
            }
          }
        }

        // -- Fallback to YouTube 9:16 link ---------------------------------
        if (!videoRecord && video.youtubeLinks.vertical) {
          videoRecord = await this.prisma.video.create({
            data: {
              userId,
              title: video.title,
              description: video.description,
              sourceType: 'MANUAL',
              status: 'READY',
              sourceUrl: video.youtubeLinks.vertical,
              instagramReelUrl: video.youtubeLinks.vertical,
              metadata: {
                source: 'google_sheets',
                format: '9:16',
                youtubeUrl: video.youtubeLinks.vertical,
                headlines: video.headlines,
                importedAt: new Date().toISOString(),
                sheetUrl,
                note: 'Vertical 9:16 format - YouTube Shorts link',
              },
            },
          });

          this.logger.log(
            `Video metadata imported from YouTube (9:16) - marked as READY: ${videoRecord.id}`,
          );
        }

        // -- Auto-create Instagram post ------------------------------------
        if (videoRecord) {
          let postCreated = false;
          let postId: string | null = null;
          let publishStatus = 'not_attempted';

          try {
            const instagramAccount =
              await this.prisma.socialAccount.findFirst({
                where: {
                  userId,
                  platform: 'INSTAGRAM',
                  status: 'ACTIVE',
                },
              });

            if (instagramAccount) {
              const caption = video.description || video.title;

              const post = await this.prisma.post.create({
                data: {
                  userId,
                  videoId: videoRecord.id,
                  accountId: instagramAccount.id,
                  caption,
                  language: 'HINGLISH',
                  hashtags: [],
                  mentions: [],
                  platform: 'INSTAGRAM',
                  postType: 'REEL',
                  status: 'DRAFT',
                  metadata: {
                    autoCreated: true,
                    fromSheet: true,
                    sheetUrl,
                    headlines: video.headlines,
                  },
                },
              });

              postId = post.id;
              postCreated = true;

              // Mark post as DRAFT (publishing can be triggered separately)
              publishStatus = 'draft';
            }
          } catch (postError: any) {
            this.logger.error(
              `Error creating auto-post for video ${videoRecord.id}: ${postError.message}`,
            );
          }

          successCount++;
          results.push({
            success: true,
            title: video.title,
            videoId: videoRecord.id,
            source: (videoRecord.metadata as any)?.driveFileId
              ? 'drive'
              : 'youtube',
            format: '9:16',
            postCreated,
            postId,
            publishStatus,
          });
        } else {
          failedCount++;
          results.push({
            success: false,
            title: video.title,
            error:
              'No 9:16 vertical video found (only importing Reels/Shorts format)',
          });
        }
      } catch (error: any) {
        failedCount++;
        this.logger.error(
          `Error processing video ${video.title}: ${error.message}`,
        );
        results.push({
          success: false,
          title: video.title,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Sheet import completed: ${successCount} succeeded, ${failedCount} failed`,
    );

    return {
      message: `Imported ${successCount} of ${parsedVideos.length} videos successfully`,
      summary: {
        total: parsedVideos.length,
        succeeded: successCount,
        failed: failedCount,
      },
      results,
    };
  }

  /**
   * Preview sheet data without importing.
   */
  async previewSheet(sheetUrl: string) {
    if (!sheetUrl) {
      throw new BadRequestException('Sheet URL is required');
    }

    const sheetData = await this.fetchSheetData(sheetUrl);
    const parsedVideos = this.parseVideos(sheetData);

    // Filter to only show videos with 9:16 format or Drive links
    const vertical9_16Videos = parsedVideos.filter(
      (v) => v.youtubeLinks.vertical || v.driveLinks.length > 0,
    );

    return {
      message: 'Sheet data fetched successfully (only 9:16 vertical format)',
      summary: {
        totalVideos: parsedVideos.length,
        vertical9_16Videos: vertical9_16Videos.length,
        videosWithDriveLinks: vertical9_16Videos.filter(
          (v) => v.driveLinks.length > 0,
        ).length,
        skipped: parsedVideos.length - vertical9_16Videos.length,
      },
      videos: vertical9_16Videos.map((v) => ({
        title: v.title,
        description: v.description.substring(0, 100) + '...',
        driveLinksCount: v.driveLinks.length,
        has9_16: !!v.youtubeLinks.vertical,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Sheet fetching / parsing helpers
  // ---------------------------------------------------------------------------

  private async fetchSheetData(sheetUrl: string): Promise<SheetVideoData[]> {
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      throw new BadRequestException('Invalid Google Sheets URL');
    }

    const sheetId = sheetIdMatch[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    this.logger.log(`Fetching sheet data from: ${csvUrl}`);

    let response: any;
    try {
      response = await axios.get(csvUrl, {
        maxRedirects: 5,
        timeout: 30000,
      });
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new BadRequestException(
          'Sheet is not publicly accessible. Please go to Google Sheets → Share → Change to "Anyone with the link"',
        );
      }
      if (err.code === 'ECONNABORTED') {
        throw new BadRequestException('Sheet fetch timed out. Please try again.');
      }
      throw new BadRequestException(
        `Failed to fetch sheet: ${err.message}`,
      );
    }

    const csvData = response.data;

    // Validate that we got CSV, not HTML (e.g. a login page)
    if (typeof csvData === 'string' && csvData.trim().startsWith('<!DOCTYPE')) {
      throw new BadRequestException(
        'Sheet is not publicly accessible. Please go to Google Sheets → Share → Change to "Anyone with the link"',
      );
    }

    const rows = this.parseCSV(csvData);

    this.logger.log(`Parsed ${rows.length} rows from sheet`);
    return rows;
  }

  private parseCSV(csvText: string): SheetVideoData[] {
    const lines = csvText.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('Sheet has no data');
    }

    const dataRows = lines.slice(1); // skip header
    const videos: SheetVideoData[] = [];

    for (const line of dataRows) {
      const values = this.parseCSVLine(line);
      if (values.length < 2) continue; // need at least creative name + description

      videos.push({
        creativeName: values[0] || '',
        description: values[1] || '',
        headlines: values[2] || '',
        metaStatic: values[3] || '',
        googleStatic: values[4] || '',
        videoWith1rsCTA: values[5] || '',
        videoWithWatchNow: values[6] || '',
        video16_9: values[7] || '',
        video1_1: values[8] || '',
        video9_16: values[9] || '',
      });
    }

    return videos;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  private isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return /youtube\.com|youtu\.be/i.test(url);
  }

  private isDriveUrl(url: string): boolean {
    if (!url) return false;
    return /drive\.google\.com|docs\.google\.com.*\/d\/|open\?id=/i.test(url);
  }

  private parseVideos(sheetData: SheetVideoData[]): ParsedVideo[] {
    return sheetData.map((row) => {
      // Extract Drive links from ALL columns (including 9:16, 16:9, 1:1)
      const driveLinks: string[] = [];
      [
        row.metaStatic,
        row.googleStatic,
        row.videoWith1rsCTA,
        row.videoWithWatchNow,
        row.video16_9,
        row.video1_1,
        row.video9_16,
      ].forEach((link) => {
        if (link && this.isDriveUrl(link)) {
          driveLinks.push(link);
        }
      });

      // Extract YouTube links (support youtube.com/watch, youtube.com/shorts, youtu.be)
      const youtubeLinks: {
        landscape?: string;
        square?: string;
        vertical?: string;
      } = {};
      if (row.video16_9 && this.isYouTubeUrl(row.video16_9)) {
        youtubeLinks.landscape = row.video16_9;
      }
      if (row.video1_1 && this.isYouTubeUrl(row.video1_1)) {
        youtubeLinks.square = row.video1_1;
      }
      if (row.video9_16 && this.isYouTubeUrl(row.video9_16)) {
        youtubeLinks.vertical = row.video9_16;
      }

      // Caption: use description (col B), fallback to headlines (col C)
      const caption = row.description || row.headlines || '';

      return {
        title: row.creativeName || 'Untitled Video',
        description: caption,
        headlines: row.headlines || '',
        driveLinks,
        youtubeLinks,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // URL extraction helpers
  // ---------------------------------------------------------------------------

  private extractDriveFileId(driveUrl: string): string | null {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,         // drive.google.com/file/d/FILE_ID
      /[?&]id=([a-zA-Z0-9-_]+)/,              // drive.google.com/open?id=FILE_ID
      /\/folders\/([a-zA-Z0-9-_]+)/,           // drive.google.com/folders/FOLDER_ID
      /\/d\/([a-zA-Z0-9-_]+)/,                 // docs.google.com/*/d/FILE_ID
      /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9-_]+)/, // direct download link
    ];

    for (const pattern of patterns) {
      const match = driveUrl.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}
