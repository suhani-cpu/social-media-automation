"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const accounts_module_1 = require("./accounts/accounts.module");
const oauth_module_1 = require("./oauth/oauth.module");
const drive_module_1 = require("./drive/drive.module");
const videos_module_1 = require("./videos/videos.module");
const posts_module_1 = require("./posts/posts.module");
const analytics_module_1 = require("./analytics/analytics.module");
const clips_module_1 = require("./clips/clips.module");
const sheets_module_1 = require("./sheets/sheets.module");
const queue_module_1 = require("./queue/queue.module");
const scheduler_module_1 = require("./scheduler/scheduler.module");
const storage_module_1 = require("./storage/storage.module");
const social_media_module_1 = require("./social-media/social-media.module");
const video_processing_module_1 = require("./video-processing/video-processing.module");
const video_cutting_module_1 = require("./video-cutting/video-cutting.module");
const caption_module_1 = require("./caption/caption.module");
const stage_ott_module_1 = require("./stage-ott/stage-ott.module");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: 'medium',
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            ...(process.env.REDIS_URL
                ? [
                    bull_1.BullModule.forRootAsync({
                        imports: [config_1.ConfigModule],
                        useFactory: (configService) => ({
                            redis: configService.get('REDIS_URL'),
                        }),
                        inject: [config_1.ConfigService],
                    }),
                ]
                : []),
            prisma_module_1.PrismaModule,
            storage_module_1.StorageModule,
            social_media_module_1.SocialMediaModule,
            video_processing_module_1.VideoProcessingModule,
            video_cutting_module_1.VideoCuttingModule,
            caption_module_1.CaptionModule,
            queue_module_1.QueueModule,
            auth_module_1.AuthModule,
            accounts_module_1.AccountsModule,
            oauth_module_1.OAuthModule,
            drive_module_1.DriveModule,
            videos_module_1.VideosModule,
            posts_module_1.PostsModule,
            analytics_module_1.AnalyticsModule,
            clips_module_1.ClipsModule,
            sheets_module_1.SheetsModule,
            scheduler_module_1.SchedulerModule,
            stage_ott_module_1.StageOttModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map