"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIDEO_URL_FIELDS = exports.FORMATS = void 0;
exports.getFormat = getFormat;
exports.getAllFormatNames = getAllFormatNames;
exports.FORMATS = {
    INSTAGRAM_REEL: {
        name: 'Instagram Reel',
        resolution: '1080x1920',
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        videoBitrate: '5000k',
        audioBitrate: '128k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        maxDuration: 90,
        description: 'Vertical video for Instagram Reels (max 90 seconds)',
    },
    INSTAGRAM_FEED: {
        name: 'Instagram Feed',
        resolution: '1080x1080',
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        videoBitrate: '5000k',
        audioBitrate: '128k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        description: 'Square video for Instagram Feed (unlimited duration)',
    },
    YOUTUBE_SHORTS: {
        name: 'YouTube Shorts',
        resolution: '1080x1920',
        width: 1080,
        height: 1920,
        aspectRatio: '9:16',
        videoBitrate: '8000k',
        audioBitrate: '192k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        maxDuration: 60,
        description: 'Vertical video for YouTube Shorts (max 60 seconds)',
    },
    YOUTUBE_VIDEO: {
        name: 'YouTube Video',
        resolution: '1920x1080',
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        videoBitrate: '8000k',
        audioBitrate: '192k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        description: 'Landscape video for YouTube regular videos',
    },
    YOUTUBE_SQUARE: {
        name: 'YouTube Square',
        resolution: '1080x1080',
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        videoBitrate: '8000k',
        audioBitrate: '192k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        description: 'Square video for YouTube (1:1 format)',
    },
    FACEBOOK_SQUARE: {
        name: 'Facebook Square',
        resolution: '1080x1080',
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        videoBitrate: '5000k',
        audioBitrate: '128k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        description: 'Square video for Facebook Feed',
    },
    FACEBOOK_LANDSCAPE: {
        name: 'Facebook Landscape',
        resolution: '1920x1080',
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        videoBitrate: '5000k',
        audioBitrate: '128k',
        fps: 30,
        codec: 'libx264',
        audioCodec: 'aac',
        format: 'mp4',
        description: 'Landscape video for Facebook',
    },
};
function getFormat(formatName) {
    const format = exports.FORMATS[formatName];
    if (!format) {
        throw new Error(`Unknown format: ${formatName}`);
    }
    return format;
}
function getAllFormatNames() {
    return Object.keys(exports.FORMATS);
}
exports.VIDEO_URL_FIELDS = {
    INSTAGRAM_REEL: 'instagramReelUrl',
    INSTAGRAM_FEED: 'instagramFeedUrl',
    YOUTUBE_SHORTS: 'youtubeShortsUrl',
    YOUTUBE_VIDEO: 'youtubeVideoUrl',
    YOUTUBE_SQUARE: 'youtubeSquareUrl',
    FACEBOOK_SQUARE: 'facebookSquareUrl',
    FACEBOOK_LANDSCAPE: 'facebookLandscapeUrl',
};
//# sourceMappingURL=formats.js.map