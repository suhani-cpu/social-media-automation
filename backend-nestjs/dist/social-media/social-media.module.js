"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../prisma/prisma.module");
const storage_module_1 = require("../storage/storage.module");
const oauth_module_1 = require("../oauth/oauth.module");
const video_processing_module_1 = require("../video-processing/video-processing.module");
const youtube_service_1 = require("./youtube/youtube.service");
const instagram_service_1 = require("./instagram/instagram.service");
const facebook_service_1 = require("./facebook/facebook.service");
let SocialMediaModule = class SocialMediaModule {
};
exports.SocialMediaModule = SocialMediaModule;
exports.SocialMediaModule = SocialMediaModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, storage_module_1.StorageModule, oauth_module_1.OAuthModule, video_processing_module_1.VideoProcessingModule],
        providers: [youtube_service_1.YouTubeService, instagram_service_1.InstagramService, facebook_service_1.FacebookService],
        exports: [youtube_service_1.YouTubeService, instagram_service_1.InstagramService, facebook_service_1.FacebookService],
    })
], SocialMediaModule);
//# sourceMappingURL=social-media.module.js.map