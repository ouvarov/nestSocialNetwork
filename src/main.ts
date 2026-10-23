import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { SocketIoAdapter } from './common/adapters/socket-io.adapter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { Env } from './config/env.schema';
import { API_PREFIX, createOpenApiDocument } from './openapi/openapi-document';
import {
  LOCAL_UPLOADS_DIR,
  LOCAL_UPLOADS_ROUTE,
} from './storage/local-storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  app.useWebSocketAdapter(
    new SocketIoAdapter(app, configService.get('CORS_ORIGIN', { infer: true })),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  if (configService.get('STORAGE_DRIVER', { infer: true }) === 'local') {
    app.useStaticAssets(LOCAL_UPLOADS_DIR, { prefix: LOCAL_UPLOADS_ROUTE });
  }
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  SwaggerModule.setup('docs', app, createOpenApiDocument(app));

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', { infer: true }),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
