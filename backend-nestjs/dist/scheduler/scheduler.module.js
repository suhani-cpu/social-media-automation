"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const cron_jobs_service_1 = require("./cron-jobs.service");
const post_scheduler_service_1 = require("./post-scheduler.service");
const cron_controller_1 = require("./cron.controller");
const posts_module_1 = require("../posts/posts.module");
let SchedulerModule = class SchedulerModule {
};
exports.SchedulerModule = SchedulerModule;
exports.SchedulerModule = SchedulerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            posts_module_1.PostsModule,
            bull_1.BullModule.registerQueue({ name: 'post-publishing' }, { name: 'analytics-sync' }),
        ],
        controllers: [cron_controller_1.CronController],
        providers: [cron_jobs_service_1.CronJobsService, post_scheduler_service_1.PostSchedulerService],
        exports: [post_scheduler_service_1.PostSchedulerService],
    })
], SchedulerModule);
//# sourceMappingURL=scheduler.module.js.map