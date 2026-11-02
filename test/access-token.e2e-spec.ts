import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { api, createTestApp, registerUser } from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const usersWith = (token: string) =>
  api(app).get('/api/users').set('Authorization', `Bearer ${token}`);

it('refuses an access token that has expired', async () => {
  const user = await registerUser(app);
  const expiredToken = app
    .get(JwtService)
    .sign({ sub: user.id, typ: 'access' }, { expiresIn: -10 });

  await usersWith(expiredToken).expect(401);
});

it('refuses a refresh token used as an access token', async () => {
  const user = await registerUser(app);
  const refreshShapedToken = app
    .get(JwtService)
    .sign({ sub: user.id, typ: 'refresh' }, { expiresIn: 60 });

  await usersWith(refreshShapedToken).expect(401);
});

it('refuses a token signed with another secret', async () => {
  const user = await registerUser(app);
  const forgedToken = new JwtService({
    secret: 'f'.repeat(32),
  }).sign({ sub: user.id, typ: 'access' }, { expiresIn: 60 });

  await usersWith(forgedToken).expect(401);
});

it('accepts a fresh access token', async () => {
  const user = await registerUser(app);

  await usersWith(user.accessToken).expect(200);
});
