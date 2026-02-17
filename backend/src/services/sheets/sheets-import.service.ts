import axios from 'axios';
import { logger } from '../../utils/logger';

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

export class SheetsImportService {
  /**
   * Fetch data from Google Sheets as CSV
   */
  async fetchSheetData(sheetUrl: string): Promise<SheetVideoData[]> {
    try {
      // Extract sheet ID from URL
      const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL');
      }

      const sheetId = sheetIdMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      logger.info(`Fetching sheet data from: ${csvUrl}`);

      const response = await axios.get(csvUrl, {
        maxRedirects: 5,
        timeout: 30000,
      });

      const csvData = response.data;
      const rows = this.parseCSV(csvData);

      logger.info(`Parsed ${rows.length} rows from sheet`);
      return rows;
    } catch (error) {
      logger.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV string to array of objects
   */
  private parseCSV(csvText: string): SheetVideoData[] {
    const lines = csvText.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('Sheet has no data');
    }

    // Skip header row
    const dataRows = lines.slice(1);
    const videos: SheetVideoData[] = [];

    for (const line of dataRows) {
      const values = this.parseCSVLine(line);
      if (values.length < 10) continue; // Skip incomplete rows

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

  /**
   * Parse a single CSV line handling quoted values
   */
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

  /**
   * Parse sheet data into structured video objects
   */
  parseVideos(sheetData: SheetVideoData[]): ParsedVideo[] {
    return sheetData.map((row) => {
      // Extract Drive links from various columns
      const driveLinks: string[] = [];
      [
        row.metaStatic,
        row.googleStatic,
        row.videoWith1rsCTA,
        row.videoWithWatchNow,
      ].forEach((link) => {
        if (link && link.includes('drive.google.com')) {
          driveLinks.push(link);
        }
      });

      // Extract YouTube links
      const youtubeLinks: { landscape?: string; square?: string; vertical?: string } = {};
      if (row.video16_9 && row.video16_9.includes('youtube.com')) {
        youtubeLinks.landscape = row.video16_9;
      }
      if (row.video1_1 && row.video1_1.includes('youtube.com')) {
        youtubeLinks.square = row.video1_1;
      }
      if (row.video9_16 && row.video9_16.includes('youtube.com')) {
        youtubeLinks.vertical = row.video9_16;
      }

      return {
        title: row.creativeName || 'Untitled Video',
        description: row.description || '',
        headlines: row.headlines || '',
        driveLinks,
        youtubeLinks,
      };
    });
  }

  /**
   * Extract Google Drive file ID from URL
   */
  extractDriveFileId(driveUrl: string): string | null {
    // Handle different Drive URL formats
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/open?id=FILE_ID
    // https://drive.google.com/uc?id=FILE_ID

    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /\/folders\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of patterns) {
      const match = driveUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYoutubeVideoId(youtubeUrl: string): string | null {
    // Handle different YouTube URL formats
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://youtube.com/shorts/VIDEO_ID

    const patterns = [
      /[?&]v=([a-zA-Z0-9-_]+)/,
      /youtu\.be\/([a-zA-Z0-9-_]+)/,
      /shorts\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of patterns) {
      const match = youtubeUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
