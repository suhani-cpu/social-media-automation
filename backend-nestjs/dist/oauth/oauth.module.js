"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const oauth_controller_1 = require("./oauth.controller");
const youtube_oauth_service_1 = require("./services/youtube-oauth.service");
const facebook_oauth_service_1 = require("./services/facebook-oauth.service");
const instagram_oauth_service_1 = require("./services/instagram-oauth.service");
const drive_oauth_service_1 = require("./services/drive-oauth.service");
let OAuthModule = class OAuthModule {
};
exports.OAuthModule = OAuthModule;
exports.OAuthModule = OAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        controllers: [oauth_controller_1.OAuthController],
        providers: [
            youtube_oauth_service_1.YouTubeOAuthService,
            facebook_oauth_service_1.FacebookOAuthService,
            instagram_oauth_service_1.InstagramOAuthService,
            drive_oauth_service_1.DriveOAuthService,
        ],
        exports: [
            youtube_oauth_service_1.YouTubeOAuthService,
            facebook_oauth_service_1.FacebookOAuthService,
            instagram_oauth_service_1.InstagramOAuthService,
            drive_oauth_service_1.DriveOAuthService,
        ],
    })
], OAuthModule);
//# sourceMappingURL=oauth.module.js.map