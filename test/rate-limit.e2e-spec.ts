import type { NestExpressApplication } from '@nestjs/platform-express';

import { PASSWORD, api, createTestApp, uniqueEmail } from './support';

const SIGN_IN_LIMIT = 5;

let app: NestExpressApplication;

beforeAll(async () => {
  process.env.RATE_LIMIT_DISABLED = 'false';
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

it('allows five sign-in attempts a minute, then answers 429', async () => {
  const login = () =>
    api(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: PASSWORD });

  for (let attempt = 0; attempt < SIGN_IN_LIMIT; attempt += 1) {
    await login().expect(401);
  }
  const limited = await login().expect(429);

  expect(limited.headers['retry-after']).toEqual(expect.any(String));
});

it('does not limit health checks', async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await api(app).get('/api/health/live').expect(200);
  }
});
