"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const video_processing_processor_1 = require("./video-processing.processor");
const post_publishing_processor_1 = require("./post-publishing.processor");
const analytics_sync_processor_1 = require("./analytics-sync.processor");
const video_processing_module_1 = require("../video-processing/video-processing.module");
const social_media_module_1 = require("../social-media/social-media.module");
const analytics_module_1 = require("../analytics/analytics.module");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueue({ name: 'video-processing' }, { name: 'post-publishing' }, { name: 'analytics-sync' }),
            (0, common_1.forwardRef)(() => video_processing_module_1.VideoProcessingModule),
            (0, common_1.forwardRef)(() => social_media_module_1.SocialMediaModule),
            (0, common_1.forwardRef)(() => analytics_module_1.AnalyticsModule),
        ],
        providers: [
            video_processing_processor_1.VideoProcessingProcessor,
            post_publishing_processor_1.PostPublishingProcessor,
            analytics_sync_processor_1.AnalyticsSyncProcessor,
        ],
        exports: [bull_1.BullModule],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map