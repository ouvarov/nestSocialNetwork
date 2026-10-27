import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { createOpenApiDocument } from './openapi/openapi-document';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = configureApp(app);

  SwaggerModule.setup('docs', app, createOpenApiDocument(app));

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
