import type { NestExpressApplication } from '@nestjs/platform-express';

import type { UserResponseDto } from '@/user/dto/user-response.dto';

import { api, bearer, createTestApp, registerUser } from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

it('lists users without emails or password hashes', async () => {
  const user = await registerUser(app, 'Listed');

  const response = await api(app)
    .get('/api/users')
    .set(bearer(user))
    .expect(200);
  const users = response.body as UserResponseDto[];
  const listed = users.find(({ id }) => id === user.id);

  expect(listed).toMatchObject({ userName: 'Listed' });
  expect(JSON.stringify(users)).not.toMatch(/"(email|password)"/);
});

it('returns a profile by id', async () => {
  const [viewer, other] = await Promise.all([
    registerUser(app),
    registerUser(app, 'Profiled'),
  ]);

  const response = await api(app)
    .get(`/api/users/${other.id}`)
    .set(bearer(viewer))
    .expect(200);

  expect(response.body).toMatchObject({ id: other.id, userName: 'Profiled' });
  expect(response.body).not.toHaveProperty('email');
});

it('answers 404 for an unknown user and 400 for a malformed id', async () => {
  const viewer = await registerUser(app);

  await api(app)
    .get('/api/users/00000000-0000-4000-8000-000000000000')
    .set(bearer(viewer))
    .expect(404);
  await api(app).get('/api/users/me').set(bearer(viewer)).expect(400);
});
