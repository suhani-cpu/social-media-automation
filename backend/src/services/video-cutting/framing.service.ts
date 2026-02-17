import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const TEMP_DIR = path.join(process.cwd(), 'temp');
const PROCESS_TIMEOUT = 10 * 60 * 1000; // 10 minutes for framing (longer than clip)
const LOGO_PATH = path.join(process.cwd(), 'uploads', 'logo.png');

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function getLogoPath(): string | null {
  return fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
}

interface FramingOptions {
  aspectRatio?: string;
  paddingColor?: string;
  topCaption?: string;
  bottomCaption?: string;
  captionFontSize?: number;
  captionColor?: string;
  captionFont?: string;
  topCaptionX?: string;
  topCaptionY?: string;
  bottomCaptionX?: string;
  bottomCaptionY?: string;
  logoX?: number;
  logoY?: number;
  logoScale?: number;
  inputWidth?: number;
  inputHeight?: number;
}

interface VideoDimensions {
  width: number;
  height: number;
  duration: number;
}

interface PaddedDimensions {
  outputWidth: number;
  outputHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  padX: number;
  padY: number;
}

/**
 * Calculate dimensions for aspect ratio with padding
 */
function calculatePaddedDimensions(inputWidth: number, inputHeight: number, targetAspect: string): PaddedDimensions {
  const inputAspect = inputWidth / inputHeight;

  let outputWidth: number, outputHeight: number, padX: number, padY: number;
  const scaledWidth = inputWidth;
  const scaledHeight = inputHeight;

  if (targetAspect === '1:1') {
    // Square output - use the larger dimension
    const size = Math.max(inputWidth, inputHeight);
    outputWidth = size;
    outputHeight = size;
  } else if (targetAspect === '16:9') {
    const targetRatio = 16 / 9;

    if (inputAspect > targetRatio) {
      outputWidth = inputWidth;
      outputHeight = Math.round(inputWidth / targetRatio);
    } else {
      outputHeight = inputHeight;
      outputWidth = Math.round(inputHeight * targetRatio);
    }
  } else if (targetAspect === '9:16') {
    const targetRatio = 9 / 16;

    if (inputAspect > targetRatio) {
      outputWidth = inputWidth;
      outputHeight = Math.round(inputWidth / targetRatio);
    } else {
      outputHeight = inputHeight;
      outputWidth = Math.round(inputHeight * targetRatio);
    }
  } else {
    outputWidth = inputWidth;
    outputHeight = inputHeight;
  }

  padX = Math.round((outputWidth - scaledWidth) / 2);
  padY = Math.round((outputHeight - scaledHeight) / 2);

  return { outputWidth, outputHeight, scaledWidth, scaledHeight, padX, padY };
}

/**
 * Build ffmpeg filter complex for framing
 */
function buildFilterComplex(options: FramingOptions) {
  const {
    aspectRatio,
    paddingColor = '#000000',
    topCaption,
    bottomCaption,
    captionFontSize = 24,
    captionColor = 'white',
    captionFont = 'sans-serif',
    topCaptionX = '50',
    topCaptionY = '10',
    bottomCaptionX = '50',
    bottomCaptionY = '90',
    logoX = 85,
    logoY = 15,
    logoScale = 0.15,
    inputWidth = 1920,
    inputHeight = 1080
  } = options;

  const filters: string[] = [];
  let currentOutput = '0:v';
  let filterIndex = 0;

  const logoPath = getLogoPath();
  const hasLogo = !!logoPath;

  // If no changes needed, return null
  if (aspectRatio === 'original' && !topCaption && !bottomCaption && !hasLogo) {
    return null;
  }

  // Calculate dimensions if aspect ratio change needed
  let dims: PaddedDimensions | null = null;
  if (aspectRatio && aspectRatio !== 'original') {
    dims = calculatePaddedDimensions(inputWidth, inputHeight, aspectRatio);
    console.log('=== FRAMING DEBUG ===');
    console.log('Input:', inputWidth, 'x', inputHeight);
    console.log('Aspect ratio:', aspectRatio);
    console.log('Output:', dims.outputWidth, 'x', dims.outputHeight);
    console.log('Padding:', dims.padX, dims.padY);
    console.log('==================');
  }

  // 1. Scale and pad for aspect ratio
  if (dims) {
    const colorHex = paddingColor.replace('#', '');
    filters.push(
      `[${currentOutput}]scale=${dims.scaledWidth}:${dims.scaledHeight}[scaled${filterIndex}]`
    );
    currentOutput = `scaled${filterIndex}`;
    filterIndex++;

    filters.push(
      `[${currentOutput}]pad=${dims.outputWidth}:${dims.outputHeight}:${dims.padX}:${dims.padY}:color=#${colorHex}[padded${filterIndex}]`
    );
    currentOutput = `padded${filterIndex}`;
    filterIndex++;
  }

  // Font mapping
  const fontMap: Record<string, string> = {
    'sans-serif': 'Sans',
    'serif': 'Serif',
    'monospace': 'Monospace',
    'arial': 'Arial',
    'helvetica': 'Helvetica',
    'times': 'Times',
    'georgia': 'Georgia',
    'impact': 'Impact'
  };
  const fontFamily = fontMap[captionFont] || 'Sans';

  const textColor = captionColor.startsWith('#') ? captionColor.slice(1) : captionColor;

  // 2. Top caption
  if (topCaption && topCaption.trim()) {
    const escapedText = topCaption.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const xPercent = parseInt(topCaptionX, 10) || 50;
    const xPos = `(w*${xPercent}/100-text_w/2)`;
    const yPercent = parseInt(topCaptionY, 10) || 10;
    const yPos = `(h*${yPercent}/100-text_h/2)`;

    filters.push(
      `[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[top${filterIndex}]`
    );
    currentOutput = `top${filterIndex}`;
    filterIndex++;
  }

  // 3. Bottom caption
  if (bottomCaption && bottomCaption.trim()) {
    const escapedText = bottomCaption.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const xPercent = parseInt(bottomCaptionX, 10) || 50;
    const xPos = `(w*${xPercent}/100-text_w/2)`;
    const yPercent = parseInt(bottomCaptionY, 10) || 90;
    const yPos = `(h*${yPercent}/100-text_h/2)`;

    filters.push(
      `[${currentOutput}]drawtext=text='${escapedText}':fontsize=${captionFontSize}:fontcolor=0x${textColor}:x=${xPos}:y=${yPos}:shadowcolor=black:shadowx=2:shadowy=2[bottom${filterIndex}]`
    );
    currentOutput = `bottom${filterIndex}`;
    filterIndex++;
  }

  // 4. Logo overlay
  if (hasLogo) {
    const outputWidth = dims ? dims.outputWidth : inputWidth;
    const logoW = Math.round(outputWidth * logoScale);

    const logoXPercent = parseInt(String(logoX), 10) || 85;
    const logoYPercent = parseInt(String(logoY), 10) || 15;
    const overlayX = `(W*${logoXPercent}/100-w/2)`;
    const overlayY = `(H*${logoYPercent}/100-h/2)`;

    filters.push(
      `[1:v]scale=${logoW}:-1[logo${filterIndex}]`
    );
    filters.push(
      `[${currentOutput}][logo${filterIndex}]overlay=${overlayX}:${overlayY}[final${filterIndex}]`
    );
    currentOutput = `final${filterIndex}`;
    filterIndex++;
  }

  // Mark final output
  if (filters.length > 0) {
    const lastFilter = filters[filters.length - 1];
    filters[filters.length - 1] = lastFilter.replace(/\[[^\]]+\]$/, '[vout]');
  }

  const result = {
    filterComplex: filters.join(';'),
    outputLabel: 'vout',
    hasLogo
  };
  console.log('Generated filter_complex:', result.filterComplex);
  return result;
}

/**
 * Get video dimensions using ffprobe
 */
export function getVideoDimensions(inputPath: string): Promise<VideoDimensions> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        width: videoStream.width,
        height: videoStream.height,
        duration: metadata.format.duration || 0
      });
    });
  });
}

/**
 * Apply framing to a video file
 */
export async function applyFraming(inputPath: string, options: FramingOptions): Promise<string> {
  ensureTempDir();

  // Get input dimensions
  const dimensions = await getVideoDimensions(inputPath);

  const filterResult = buildFilterComplex({
    ...options,
    inputWidth: dimensions.width,
    inputHeight: dimensions.height
  });

  // If no filters needed, return input as-is
  if (!filterResult) {
    return inputPath;
  }

  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join(TEMP_DIR, outputFileName);
  const logoPath = getLogoPath();

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;
    let command: any;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      if (command) {
        command.kill('SIGKILL');
      }
      cleanup();
      reject(new Error('Framing timeout - exceeded 10 minutes'));
    }, PROCESS_TIMEOUT);

    command = ffmpeg(inputPath);

    // Add logo as second input if needed
    if (filterResult.hasLogo && logoPath) {
      command.input(logoPath);
    }

    command
      .complexFilter(filterResult.filterComplex)
      .outputOptions([
        '-map', `[${filterResult.outputLabel}]`,
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac'
      ])
      .output(outputPath)
      .on('end', () => {
        cleanup();
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        cleanup();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(new Error(`Framing error: ${err.message}`));
      });

    command.run();
  });
}
