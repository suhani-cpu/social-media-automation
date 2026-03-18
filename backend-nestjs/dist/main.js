"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const helmet_1 = __importDefault(require("helmet"));
const express_1 = __importDefault(require("express"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
BigInt.prototype.toJSON = function () {
    return Number(this);
};
const server = (0, express_1.default)();
async function createApp() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(server));
    const configService = app.get(config_1.ConfigService);
    const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3001');
    const nodeEnv = configService.get('NODE_ENV', 'development');
    app.setGlobalPrefix('api');
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
    }));
    const allowAllOrigins = configService.get('ALLOW_ALL_ORIGINS', 'false') === 'true';
    const allowedOrigins = configService.get('ALLOWED_ORIGINS', '');
    app.enableCors({
        origin: allowAllOrigins
            ? '*'
            : allowedOrigins
                ? allowedOrigins.split(',')
                : nodeEnv === 'production'
                    ? frontendUrl
                    : [frontendUrl, 'http://localhost:3001'],
        credentials: !allowAllOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    await app.init();
    return app;
}
let appPromise;
async function handler(req, res) {
    if (!appPromise) {
        appPromise = createApp();
    }
    await appPromise;
    server(req, res);
}
if (process.env.VERCEL !== '1') {
    const logger = new common_1.Logger('Bootstrap');
    createApp().then(async (app) => {
        const configService = app.get(config_1.ConfigService);
        const port = configService.get('PORT', 3000);
        const nodeEnv = configService.get('NODE_ENV', 'development');
        await app.listen(port);
        logger.log(`Server running on port ${port}`);
        logger.log(`Environment: ${nodeEnv}`);
        logger.log(`API: http://localhost:${port}/api`);
    });
}
//# sourceMappingURL=main.js.map