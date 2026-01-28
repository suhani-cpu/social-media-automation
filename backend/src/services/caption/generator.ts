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

// Haryanvi vocabulary reference
const haryanviVocab = {
  greetings: ['सै भाई', 'राम-राम', 'नमस्ते'],
  descriptive: ['धाकड़', 'जोरदार', 'कमाल का', 'जबरदस्त', 'बढ़िया', 'मस्त'],
  phrases: ['थारे काम की', 'यो तो', 'देख ले', 'सुण तो', 'एकदम सही'],
};

export async function generateCaption(
  request: CaptionRequest
): Promise<CaptionVariation[]> {
  logger.info('Generating caption', { language: request.language, platform: request.platform });

  const variations: CaptionVariation[] = [];

  // Generate 3 variations based on language and platform
  if (request.language === 'HARYANVI') {
    variations.push(
      generateHaryanviCaption(request),
      generateHaryanviCasualCaption(request),
      generateHaryanviRegionalCaption(request)
    );
  } else if (request.language === 'HINGLISH') {
    variations.push(
      generateHinglishCaption(request),
      generateHinglishTrendyCaption(request),
      generateHinglishRelatableCaption(request)
    );
  } else {
    variations.push(
      generateEnglishCaption(request),
      generateEnglishCasualCaption(request),
      generateEnglishProfessionalCaption(request)
    );
  }

  return variations;
}

function generateHaryanviCaption(request: CaptionRequest): CaptionVariation {
  const greeting = haryanviVocab.greetings[Math.floor(Math.random() * haryanviVocab.greetings.length)];
  const descriptive = haryanviVocab.descriptive[Math.floor(Math.random() * haryanviVocab.descriptive.length)];

  const caption = `${greeting}! 🙏

यो ${request.videoTitle} तो ${descriptive} है! 💪
थारे देखने के काम का - एकदम सही content! 🔥

देख लो aur share करो! ✨`;

  const hashtags = ['#Haryanvi', '#Dhaakad', '#Regional', '#Video'];

  return {
    caption,
    hashtags,
    characterCount: caption.length,
  };
}

function generateHaryanviCasualCaption(request: CaptionRequest): CaptionVariation {
  const caption = `सै भाई! यो video जोरदार है 🎬

${request.videoTitle} - थारे entertainment के लिए!
देख लो aur बताओ kaisa लगा! 💯

#Haryanvi #Video #Entertainment`;

  return {
    caption,
    hashtags: ['#Haryanvi', '#Video', '#Entertainment'],
    characterCount: caption.length,
  };
}

function generateHaryanviRegionalCaption(request: CaptionRequest): CaptionVariation {
  const caption = `राम-राम दोस्तों! 🙏

यो ${request.videoTitle} तो एकदम धाकड़ content है!
थारे पूरे परिवार के साथ देखणे योग्य 👨‍👩‍👧‍👦

सुण तो - miss मत करियो! 🔥

#HaryanviContent #Family #Regional #MustWatch`;

  return {
    caption,
    hashtags: ['#HaryanviContent', '#Family', '#Regional', '#MustWatch'],
    characterCount: caption.length,
  };
}

function generateHinglishCaption(request: CaptionRequest): CaptionVariation {
  const caption = `Guys! Ye ${request.videoTitle} dekhna mat bhoolna! 🔥

${request.videoDescription || 'Amazing content straight for you!'}

Double tap agar pasand aaye! ❤️
Tag karo apne doston ko! 👥

#Trending #MustWatch #ViralVideo`;

  return {
    caption,
    hashtags: ['#Trending', '#MustWatch', '#ViralVideo'],
    characterCount: caption.length,
  };
}

function generateHinglishTrendyCaption(request: CaptionRequest): CaptionVariation {
  const caption = `Yaar! 🎬 ${request.videoTitle}

Ye toh kamaal ki content hai! 💯
Dekho aur enjoy karo! 🍿

Save kar lo baad mein dekhne ke liye! 🔖

#Hinglish #Trending #Video #Entertainment`;

  return {
    caption,
    hashtags: ['#Hinglish', '#Trending', '#Video', '#Entertainment'],
    characterCount: caption.length,
  };
}

function generateHinglishRelatableCaption(request: CaptionRequest): CaptionVariation {
  const caption = `Suno suno! 👂

${request.videoTitle} - bilkul relatable content!
Sabko share karo! 📲

Comment mein batao - kaisa laga? 💬

#Relatable #Hinglish #Viral #Share`;

  return {
    caption,
    hashtags: ['#Relatable', '#Hinglish', '#Viral', '#Share'],
    characterCount: caption.length,
  };
}

function generateEnglishCaption(request: CaptionRequest): CaptionVariation {
  const caption = `Check out ${request.videoTitle}! 🎬

${request.videoDescription || 'Amazing content you don\'t want to miss!'}

Like and share if you enjoyed it! ❤️

#Video #Entertainment #MustWatch`;

  return {
    caption,
    hashtags: ['#Video', '#Entertainment', '#MustWatch'],
    characterCount: caption.length,
  };
}

function generateEnglishCasualCaption(request: CaptionRequest): CaptionVariation {
  const caption = `New video alert! 🚨

${request.videoTitle} is here!
Watch now and let me know what you think! 💭

#NewVideo #Content #Entertainment`;

  return {
    caption,
    hashtags: ['#NewVideo', '#Content', '#Entertainment'],
    characterCount: caption.length,
  };
}

function generateEnglishProfessionalCaption(request: CaptionRequest): CaptionVariation {
  const caption = `${request.videoTitle}

${request.videoDescription || 'Quality content delivered straight to you.'}

Share your thoughts in the comments below! 👇

#Content #Video #Quality #Professional`;

  return {
    caption,
    hashtags: ['#Content', '#Video', '#Quality', '#Professional'],
    characterCount: caption.length,
  };
}
