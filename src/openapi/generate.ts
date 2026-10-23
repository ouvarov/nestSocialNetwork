import { writeFile } from 'node:fs/promises';

import { NestFactory } from '@nestjs/core';

import { API_PREFIX, createOpenApiDocument } from './openapi-document';

const OUTPUT_PATH = 'openapi.json';

const PLACEHOLDER_ENV = {
  DATABASE_URL: 'postgres://openapi:openapi@localhost:5432/openapi',
  JWT_ACCESS_SECRET: 'openapi-placeholder-secret-32-chars!',
  REFRESH_TOKEN_SECRET: 'openapi-placeholder-secret-32-chars!',
};

const generate = async () => {
  for (const [name, value] of Object.entries(PLACEHOLDER_ENV)) {
    process.env[name] ??= value;
  }

  const { AppModule } = await import('../app.module');
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  app.setGlobalPrefix(API_PREFIX);

  const document = createOpenApiDocument(app);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`Wrote ${OUTPUT_PATH}\n`);
};

generate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
