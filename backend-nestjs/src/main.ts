import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Global prefix
  app.setGlobalPrefix('api');

  // Security
  app.use(helmet());

  // CORS — allow all origins when ALLOW_ALL_ORIGINS=true (for CMS embedding)
  const allowAllOrigins = configService.get<string>('ALLOW_ALL_ORIGINS', 'false') === 'true';
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS', '');

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

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  logger.log(`Server running on port ${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`API: http://localhost:${port}/api`);
}

bootstrap();
