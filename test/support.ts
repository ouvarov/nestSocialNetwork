import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { io, type Socket } from 'socket.io-client';
import * as request from 'supertest';

import { configureApp } from '@/app.setup';
import type { AuthResponseDto } from '@/auth/dto/auth-response.dto';
import type { ChatIdDto } from '@/chat/dto/chat-response.dto';
import type { PostResponseDto } from '@/post/dto/post-response.dto';
import { LOCAL_UPLOADS_DIR } from '@/storage/local-storage.service';
import { userImagesDir } from '@/storage/user-images';

type TestUser = {
  id: string;
  email: string;
  userName: string;
  accessToken: string;
  refreshCookie: string;
};

const PASSWORD = 'correct-horse-battery';

const createTestApp = async () => {
  const { AppModule } = await import('@/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
  });
  configureApp(app);
  await app.listen(0, '127.0.0.1');

  return app;
};

const api = (app: NestExpressApplication) => request(app.getHttpServer());

const uniqueEmail = () => `e2e-${randomUUID()}@example.com`;

const refreshCookieOf = (response: request.Response): string => {
  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
  const cookie = cookies.find((value) => value.startsWith('refresh_token='));

  if (!cookie) throw new Error('The response set no refresh cookie');

  return cookie.split(';')[0];
};

const registerUser = async (
  app: NestExpressApplication,
  userName = 'E2E User',
): Promise<TestUser> => {
  const email = uniqueEmail();
  const response = await api(app)
    .post('/api/auth/register')
    .send({ email, password: PASSWORD, userName })
    .expect(201);
  const body = response.body as AuthResponseDto;

  return {
    id: body.userData.id,
    email,
    userName,
    accessToken: body.access_token,
    refreshCookie: refreshCookieOf(response),
  };
};

const bearer = (user: TestUser) => ({
  Authorization: `Bearer ${user.accessToken}`,
});

const createPost = async (
  app: NestExpressApplication,
  user: TestUser,
  text = 'Hello from e2e',
) => {
  const response = await api(app)
    .post('/api/posts')
    .set(bearer(user))
    .send({ text })
    .expect(201);

  return response.body as PostResponseDto;
};

const createChat = async (
  app: NestExpressApplication,
  user: TestUser,
  others: TestUser[],
) => {
  const response = await api(app)
    .post('/api/chat/create')
    .set(bearer(user))
    .send({ userIds: others.map(({ id }) => id) })
    .expect(201);

  return (response.body as ChatIdDto).chatId;
};

const connectSocket = (app: NestExpressApplication, token?: string) => {
  const { port } = app.getHttpServer().address() as AddressInfo;

  return io(`http://127.0.0.1:${port}/chat`, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
};

const nextEvent = <T>(socket: Socket, event: string, timeoutMs = 5000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`No "${event}" within ${timeoutMs} ms`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const removeUploads = (user: TestUser) =>
  rm(join(LOCAL_UPLOADS_DIR, userImagesDir(user.id)), {
    recursive: true,
    force: true,
  });

export {
  PASSWORD,
  api,
  bearer,
  connectSocket,
  createChat,
  createPost,
  createTestApp,
  nextEvent,
  refreshCookieOf,
  registerUser,
  removeUploads,
  uniqueEmail,
};
export type { TestUser };
