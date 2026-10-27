import type { NestExpressApplication } from '@nestjs/platform-express';

import { PASSWORD, api, createTestApp, uniqueEmail } from './support';

const ORIGIN_SECRET = 'e2e-origin-secret-that-is-long-enough';
const SIGN_IN_LIMIT = 5;

let app: NestExpressApplication;

beforeAll(async () => {
  process.env.ORIGIN_SECRET = ORIGIN_SECRET;
  process.env.RATE_LIMIT_DISABLED = 'false';
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const loginFrom = (clientIp: string) =>
  api(app)
    .post('/api/auth/login')
    .set('x-origin-secret', ORIGIN_SECRET)
    .set('x-real-ip', clientIp)
    .send({ email: uniqueEmail(), password: PASSWORD });

it('refuses API requests that skip the web app proxy', async () => {
  await api(app).get('/api/users').expect(403);
  await api(app)
    .get('/api/users')
    .set('x-origin-secret', 'wrong-secret-that-is-long-enough-too')
    .expect(403);
});

it('passes proxied requests on to the API', async () => {
  await api(app)
    .get('/api/users')
    .set('x-origin-secret', ORIGIN_SECRET)
    .expect(401);
});

it('keeps health checks reachable directly for wake-up pings', async () => {
  await api(app).get('/api/health/live').expect(200);
  await api(app).get('/api/health/ready').expect(200);
});

it('rate limits each visitor by the IP the proxy reports', async () => {
  for (let attempt = 0; attempt < SIGN_IN_LIMIT; attempt += 1) {
    await loginFrom('203.0.113.1').expect(401);
  }

  await loginFrom('203.0.113.1').expect(429);
  await loginFrom('203.0.113.2').expect(401);
});
