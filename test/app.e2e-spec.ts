import type { NestExpressApplication } from '@nestjs/platform-express';

import { api, createTestApp } from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

it('reports liveness and readiness without a token', async () => {
  await api(app).get('/api/health/live').expect(200, { status: 'ok' });
  await api(app)
    .get('/api/health/ready')
    .expect(200, { ready: true, database: 'up', redis: 'disabled' });
});

it('answers unknown routes with a JSON 404', async () => {
  const response = await api(app).get('/api/nowhere').expect(404);

  expect(response.body).toMatchObject({ statusCode: 404 });
});

it('answers malformed JSON with 400', async () => {
  await api(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":')
    .expect(400);
});

it('allows the web origin with credentials and nothing else', async () => {
  const allowed = await api(app)
    .options('/api/auth/login')
    .set('Origin', 'http://localhost:3001')
    .set('Access-Control-Request-Method', 'POST');
  expect(allowed.headers['access-control-allow-origin']).toBe(
    'http://localhost:3001',
  );
  expect(allowed.headers['access-control-allow-credentials']).toBe('true');

  const other = await api(app)
    .options('/api/auth/login')
    .set('Origin', 'https://evil.example')
    .set('Access-Control-Request-Method', 'POST');
  expect(other.headers['access-control-allow-origin']).not.toBe(
    'https://evil.example',
  );
});
