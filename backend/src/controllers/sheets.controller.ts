import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { SheetsImportService } from '../services/sheets/sheets-import.service';
import { DriveStorageService } from '../services/google-drive/drive-storage.service';
import { prisma } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import { publishToInstagram } from '../services/social-media/instagram/client';

/**
 * Import videos from Google Sheets
 */
export const importFromSheet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sheetUrl } = req.body;

    if (!sheetUrl) {
      throw new AppError(400, 'Sheet URL is required');
    }

    const userId = req.user!.id;
    const sheetsService = new SheetsImportService();

    // Fetch and parse sheet data
    logger.info(`Starting sheet import for user ${userId}`);
    const sheetData = await sheetsService.fetchSheetData(sheetUrl);
    const parsedVideos = sheetsService.parseVideos(sheetData);

    logger.info(`Found ${parsedVideos.length} videos to import`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // Process each video
    for (const video of parsedVideos) {
      try {
        logger.info(`Processing video: ${video.title}`);

        // Try to import from Drive first, then YouTube
        let videoRecord = null;

        // Try Drive links
        if (video.driveLinks.length > 0) {
          const driveService = new DriveStorageService(userId);

          for (const driveLink of video.driveLinks) {
            const fileId = sheetsService.extractDriveFileId(driveLink);
            if (fileId) {
              try {
                // Get file metadata
                const fileMetadata = await driveService.getFileMetadata(fileId);

                // Check if it's a video file
                if (
                  fileMetadata.mimeType &&
                  fileMetadata.mimeType.startsWith('video/')
                ) {
                  // Download file
                  const tempDir = '/tmp/sheet-imports';
                  await fs.mkdir(tempDir, { recursive: true });
                  const tempFilePath = path.join(
                    tempDir,
                    `${Date.now()}-${fileMetadata.name}`
                  );
                  await driveService.downloadFile(fileId, tempFilePath);

                  // Get file stats
                  const stats = await fs.stat(tempFilePath);

                  // Create video record as READY (file already downloaded)
                  videoRecord = await prisma.video.create({
                    data: {
                      userId,
                      title: video.title,
                      description: video.description,
                      sourceType: 'MANUAL',
                      status: 'READY', // Set to READY since file is already available
                      rawVideoUrl: tempFilePath,
                      instagramReelUrl: tempFilePath, // Use same file for Instagram
                      fileSize: stats.size,
                      metadata: {
                        source: 'google_sheets',
                        driveFileId: fileId,
                        driveFileName: fileMetadata.name,
                        headlines: video.headlines,
                        importedAt: new Date().toISOString(),
                        sheetUrl,
                      },
                    },
                  });

                  logger.info(`Video imported from Drive: ${videoRecord.id}`);
                  break; // Successfully imported, move to next video
                }
              } catch (error: any) {
                logger.error(`Error importing from Drive link ${driveLink}:`, error);
                // Continue to next Drive link
              }
            }
          }
        }

        // If no Drive import succeeded, try YouTube links - ONLY 9:16 (vertical) format
        if (!videoRecord && video.youtubeLinks.vertical) {
          // Only import vertical 9:16 format
          // Mark as READY even though we don't have the file - Instagram can use the URL
          videoRecord = await prisma.video.create({
            data: {
              userId,
              title: video.title,
              description: video.description,
              sourceType: 'MANUAL',
              status: 'READY', // Mark as READY so posts can be created
              sourceUrl: video.youtubeLinks.vertical, // Use 9:16 vertical URL only
              instagramReelUrl: video.youtubeLinks.vertical, // Use YouTube URL directly
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

          logger.info(`Video metadata imported from YouTube (9:16) - marked as READY: ${videoRecord.id}`);
        }

        if (videoRecord) {
          // AUTO-CREATE AND PUBLISH POST
          let postCreated = false;
          let postId = null;
          let publishStatus = 'not_attempted';

          try {
            // Get user's Instagram account
            const instagramAccount = await prisma.socialAccount.findFirst({
              where: {
                userId,
                platform: 'INSTAGRAM',
                status: 'ACTIVE',
              },
            });

            if (instagramAccount) {
              // Create post with caption from sheet
              const caption = video.description || video.title;

              const post = await prisma.post.create({
                data: {
                  userId,
                  videoId: videoRecord.id,
                  accountId: instagramAccount.id,
                  caption,
                  language: 'HINGLISH', // Default to Hinglish for Haryanvi content
                  hashtags: [], // Extract from caption if needed
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

              // Try to publish immediately (only if video is READY)
              try {
                // Check if video is READY
                const currentVideo = await prisma.video.findUnique({
                  where: { id: videoRecord.id },
                });

                if (currentVideo && currentVideo.status === 'READY') {
                  // Update post status to PUBLISHING
                  await prisma.post.update({
                    where: { id: post.id },
                    data: { status: 'PUBLISHING' },
                  });

                  // Get full post data with relationships
                  const fullPost = await prisma.post.findUnique({
                    where: { id: post.id },
                    include: {
                      video: true,
                      account: true,
                    },
                  });

                  if (fullPost && fullPost.video && fullPost.account) {
                    // Publish to Instagram
                    const result = await publishToInstagram(fullPost, fullPost.video, fullPost.account);

                    // Update post as published
                    await prisma.post.update({
                      where: { id: post.id },
                      data: {
                        status: 'PUBLISHED',
                        publishedAt: new Date(),
                        platformPostId: result.id,
                        platformUrl: result.permalink,
                      },
                    });

                    publishStatus = 'published';
                    logger.info(`Auto-published post ${post.id} for video ${videoRecord.id}`);
                  }
                } else {
                  // Video not ready yet, mark as draft
                  publishStatus = 'not_attempted';
                  logger.info(`Video ${videoRecord.id} not ready yet, post created as DRAFT`);
                }
              } catch (publishError: any) {
                publishStatus = 'failed';
                logger.error(`Auto-publish failed for post ${post.id}:`, publishError);

                // Update post with error
                await prisma.post.update({
                  where: { id: post.id },
                  data: {
                    status: 'FAILED',
                    errorMessage: publishError.message,
                  },
                });
              }
            }
          } catch (postError: any) {
            logger.error(`Error creating auto-post for video ${videoRecord.id}:`, postError);
          }

          successCount++;
          results.push({
            success: true,
            title: video.title,
            videoId: videoRecord.id,
            source: videoRecord.metadata?.driveFileId ? 'drive' : 'youtube',
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
            error: 'No 9:16 vertical video found (only importing Reels/Shorts format)',
          });
        }
      } catch (error: any) {
        failedCount++;
        logger.error(`Error processing video ${video.title}:`, error);
        results.push({
          success: false,
          title: video.title,
          error: error.message,
        });
      }
    }

    logger.info(
      `Sheet import completed: ${successCount} succeeded, ${failedCount} failed`
    );

    res.status(201).json({
      message: `Imported ${successCount} of ${parsedVideos.length} videos successfully`,
      summary: {
        total: parsedVideos.length,
        succeeded: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview sheet data without importing
 */
export const previewSheet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sheetUrl } = req.query;

    if (!sheetUrl) {
      throw new AppError(400, 'Sheet URL is required');
    }

    const sheetsService = new SheetsImportService();

    // Fetch and parse sheet data
    const sheetData = await sheetsService.fetchSheetData(sheetUrl as string);
    const parsedVideos = sheetsService.parseVideos(sheetData);

    // Filter to only show videos with 9:16 format
    const vertical9_16Videos = parsedVideos.filter(
      (v) => v.youtubeLinks.vertical || v.driveLinks.length > 0
    );

    // Return summary
    res.json({
      message: 'Sheet data fetched successfully (only 9:16 vertical format)',
      summary: {
        totalVideos: parsedVideos.length,
        vertical9_16Videos: vertical9_16Videos.length,
        videosWithDriveLinks: vertical9_16Videos.filter((v) => v.driveLinks.length > 0)
          .length,
        skipped: parsedVideos.length - vertical9_16Videos.length,
      },
      videos: vertical9_16Videos.map((v) => ({
        title: v.title,
        description: v.description.substring(0, 100) + '...',
        driveLinksCount: v.driveLinks.length,
        has9_16: !!v.youtubeLinks.vertical,
      })),
    });
  } catch (error) {
    next(error);
  }
};
