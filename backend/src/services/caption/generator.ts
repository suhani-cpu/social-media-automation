import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger';

interface CaptionRequest {
  videoTitle: string;
  videoDescription?: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE';
  language: 'ENGLISH' | 'HINGLISH' | 'HARYANVI' | 'HINDI';
  tone: string[];
  context?: string;
}

interface CaptionVariation {
  caption: string;
  hashtags: string[];
  characterCount: number;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const languagePrompts: Record<string, string> = {
  ENGLISH: 'in English',
  HINGLISH: 'in Hinglish (mix of Hindi and English)',
  HARYANVI: 'in authentic Haryanvi dialect',
  HINDI: 'in Hindi',
};

const platformContext: Record<string, string> = {
  INSTAGRAM: 'Instagram Reel/Feed - engaging, trending style with emojis',
  FACEBOOK: 'Facebook - engaging, community-focused style',
  YOUTUBE: 'YouTube Shorts/Video - descriptive, call-to-action style',
};

export async function generateCaption(
  request: CaptionRequest
): Promise<CaptionVariation[]> {
  logger.info('Generating caption with Gemini AI', { 
    language: request.language, 
    platform: request.platform 
  });

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const language = languagePrompts[request.language] || 'in English';
  const platformInfo = platformContext[request.platform] || 'social media';
  const tones = request.tone.length > 0 ? request.tone.join(', ') : 'engaging';

  const prompt = `Generate 3 different caption variations for a social media post.

Video Title: ${request.videoTitle}
${request.videoDescription ? `Video Description: ${request.videoDescription}` : ''}
Platform: ${platformInfo}
Language: ${language}
Tone/Style: ${tones}
${request.context ? `Additional Context: ${request.context}` : ''}

For each variation:
1. Write a catchy caption (50-150 words for YouTube, 50-100 words for Instagram/Facebook)
2. Include 5-8 relevant hashtags
3. Include a call-to-action

Return the response as a JSON array with this exact structure:
[
  {"caption": "...", "hashtags": ["#tag1", "#tag2", ...]},
  {"caption": "...", "hashtags": ["#tag1", "#tag2", ...]},
  {"caption": "...", "hashtags": ["#tag1", "#tag2", ...]}
]

Make each variation unique - one casual, one professional, one trendy.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response');
    }

    const variations = JSON.parse(jsonMatch[0]) as Array<{caption: string, hashtags: string[]}>;
    
    return variations.map(v => ({
      caption: v.caption,
      hashtags: v.hashtags,
      characterCount: v.caption.length,
    }));
  } catch (error) {
    logger.error('Gemini caption generation failed', error);
    throw new Error('Failed to generate captions with AI');
  }
}
