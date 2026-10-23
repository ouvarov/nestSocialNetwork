import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { REFRESH_COOKIE_NAME } from '@/auth/refresh-cookie';

const API_PREFIX = 'api';

const createOpenApiDocument = (app: INestApplication) =>
  SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Pulse API')
      .setDescription('Social network API: auth, posts, likes, chats')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth(REFRESH_COOKIE_NAME)
      .build(),
  );

export { API_PREFIX, createOpenApiDocument };
