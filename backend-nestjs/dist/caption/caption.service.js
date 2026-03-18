"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CaptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
let CaptionService = CaptionService_1 = class CaptionService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CaptionService_1.name);
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (apiKey) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            this.logger.log('Gemini AI caption generation enabled');
        }
        else {
            this.model = null;
            this.logger.warn('GEMINI_API_KEY not set — using fallback template captions');
        }
    }
    async generate(request) {
        this.logger.log(`Generating caption: ${request.language} / ${request.platform}`);
        if (this.model) {
            return this.generateWithAI(request);
        }
        return this.generateFallback(request);
    }
    async generateWithAI(request) {
        const languageInstructions = {
            ENGLISH: 'Write in English. Use engaging, modern social media language.',
            HINGLISH: 'Write in Hinglish (mix of Hindi and English using Roman script). Example: "Yaar ye video dekho, bohot mast hai! 🔥"',
            HARYANVI: 'Write in Haryanvi dialect (using Devanagari + Roman mix). Use words like "सै भाई", "धाकड़", "जोरदार", "थारे काम की". Example: "सै भाई! यो video जोरदार है 💪"',
            HINDI: 'Write in Hindi (Devanagari script). Use natural Hindi as spoken on social media.',
            RAJASTHANI: 'Write in Rajasthani dialect (Devanagari + Roman mix). Use words like "खम्मा घणी", "भैल्यो", "घणो सारो", "पधारो". Example: "खम्मा घणी! यो video घणो सारो है 🙏"',
            BHOJPURI: 'Write in Bhojpuri dialect (Devanagari + Roman mix). Use words like "का हो", "बढ़िया बा", "देखीं", "रउआ". Example: "का हो भाई! ई video बढ़िया बा 🔥"',
        };
        const platformInstructions = {
            INSTAGRAM: 'For Instagram: Keep caption under 2200 chars. Use emojis generously. End with a call-to-action (like, share, save). Include 5-8 relevant hashtags.',
            YOUTUBE: 'For YouTube description: Can be longer (up to 500 chars for the visible part). Include keywords naturally. Add a call to subscribe. Include 3-5 hashtags.',
            FACEBOOK: 'For Facebook: Conversational tone. Ask questions to drive engagement. Keep it under 500 chars. Include 3-5 hashtags.',
        };
        const prompt = `You are a social media caption expert. Generate exactly 3 different caption variations for a video.

Video Title: "${request.videoTitle}"
${request.videoDescription ? `Video Description: "${request.videoDescription}"` : ''}
${request.context ? `Context: "${request.context}"` : ''}

Language: ${languageInstructions[request.language] || languageInstructions.ENGLISH}
Platform: ${platformInstructions[request.platform] || platformInstructions.INSTAGRAM}
Tone: ${request.tone.join(', ')}

IMPORTANT: Return ONLY valid JSON, no other text. Format:
[
  {"caption": "caption text with emojis", "hashtags": ["#tag1", "#tag2", "#tag3"]},
  {"caption": "different caption", "hashtags": ["#tag1", "#tag2", "#tag3"]},
  {"caption": "another variation", "hashtags": ["#tag1", "#tag2", "#tag3"]}
]

Make each variation distinctly different in style:
1. First: Engaging and energetic
2. Second: Professional and informative
3. Third: Casual and relatable

Include appropriate emojis. Make hashtags relevant and trending.`;
        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                this.logger.warn('AI response did not contain valid JSON, falling back');
                return this.generateFallback(request);
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((v) => ({
                caption: v.caption,
                hashtags: v.hashtags || [],
                characterCount: v.caption.length,
            }));
        }
        catch (error) {
            this.logger.error(`AI caption generation failed: ${error.message}`);
            return this.generateFallback(request);
        }
    }
    generateFallback(request) {
        const { videoTitle, language } = request;
        const templates = {
            ENGLISH: [
                { caption: `Check out "${videoTitle}"! 🎬\n\nAmazing content you don't want to miss!\n\nLike and share if you enjoyed it! ❤️`, hashtags: ['#Trending', '#MustWatch', '#Video'] },
                { caption: `New drop: ${videoTitle} 🚨\n\nWatch now and let me know what you think! 💭`, hashtags: ['#NewVideo', '#Content', '#Entertainment'] },
                { caption: `${videoTitle}\n\nQuality content delivered straight to you.\n\nShare your thoughts below! 👇`, hashtags: ['#Content', '#Quality', '#Professional'] },
            ],
            HINGLISH: [
                { caption: `Guys! "${videoTitle}" dekhna mat bhoolna! 🔥\n\nDouble tap agar pasand aaye! ❤️`, hashtags: ['#Trending', '#MustWatch', '#ViralVideo'] },
                { caption: `Yaar! 🎬 ${videoTitle}\n\nYe toh kamaal ki content hai! 💯\nSave kar lo! 🔖`, hashtags: ['#Hinglish', '#Trending', '#Video'] },
                { caption: `Suno suno! 👂\n\n${videoTitle} - bilkul relatable!\nComment mein batao kaisa laga? 💬`, hashtags: ['#Relatable', '#Hinglish', '#Viral'] },
            ],
            HARYANVI: [
                { caption: `सै भाई! 🙏\n\nयो "${videoTitle}" तो धाकड़ है! 💪\nदेख लो aur share करो! ✨`, hashtags: ['#Haryanvi', '#Dhaakad', '#Regional'] },
                { caption: `राम-राम दोस्तों! 🙏\n\n"${videoTitle}" - एकदम जोरदार content!\nसुण तो - miss मत करियो! 🔥`, hashtags: ['#HaryanviContent', '#MustWatch', '#Regional'] },
                { caption: `सै भाई! यो video जोरदार है 🎬\n\n${videoTitle} - थारे entertainment के लिए!\nबताओ kaisa लगा! 💯`, hashtags: ['#Haryanvi', '#Video', '#Entertainment'] },
            ],
            HINDI: [
                { caption: `"${videoTitle}" देखिए! 🎬\n\nयह वीडियो आपको ज़रूर पसंद आएगी!\n\nलाइक और शेयर करें! ❤️`, hashtags: ['#हिंदी', '#वीडियो', '#ट्रेंडिंग'] },
                { caption: `नई वीडियो: ${videoTitle} 🚨\n\nअभी देखें और बताएं कैसी लगी! 💭`, hashtags: ['#नईवीडियो', '#कंटेंट', '#मनोरंजन'] },
                { caption: `${videoTitle}\n\nबेहतरीन कंटेंट सिर्फ आपके लिए!\n\nअपनी राय नीचे बताएं! 👇`, hashtags: ['#कंटेंट', '#क्वालिटी', '#वीडियो'] },
            ],
            RAJASTHANI: [
                { caption: `खम्मा घणी! 🙏\n\n"${videoTitle}" - घणो सारो content है!\nजरूर देखो अर share करो! ✨`, hashtags: ['#Rajasthani', '#GhanoSaro', '#Regional'] },
                { caption: `पधारो म्हारे channel में! 🎬\n\n"${videoTitle}" - एकदम भैल्यो!\nदेखो अर बताओ कियां लागो! 💯`, hashtags: ['#Rajasthani', '#Padharo', '#Video'] },
                { caption: `खम्मा घणी सा! 🙏\n\nयो "${videoTitle}" तो काम रो है!\nसगळा ने दिखाओ! 🔥`, hashtags: ['#Rajasthani', '#Content', '#MustWatch'] },
            ],
            BHOJPURI: [
                { caption: `का हो भाई! 🙏\n\n"${videoTitle}" - ई video बढ़िया बा! 💪\nदेखीं अउर share करीं! ✨`, hashtags: ['#Bhojpuri', '#Badhiya', '#Regional'] },
                { caption: `अरे वाह! 🎬\n\n"${videoTitle}" - एकदम मस्त बा!\nरउआ सभे के देखे के चाहीं! 💯`, hashtags: ['#Bhojpuri', '#Mast', '#Video'] },
                { caption: `सुनीं सुनीं! 👂\n\n${videoTitle} - बहुत बढ़िया content बा!\nबताईं कइसन लागल? 💬`, hashtags: ['#Bhojpuri', '#Content', '#Entertainment'] },
            ],
        };
        const variations = templates[language] || templates.ENGLISH;
        return variations.map((v) => ({
            caption: v.caption,
            hashtags: v.hashtags,
            characterCount: v.caption.length,
        }));
    }
};
exports.CaptionService = CaptionService;
exports.CaptionService = CaptionService = CaptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CaptionService);
//# sourceMappingURL=caption.service.js.map