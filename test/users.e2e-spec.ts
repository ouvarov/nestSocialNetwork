import type { NestExpressApplication } from '@nestjs/platform-express';

import type { UserPageDto } from '@/user/dto/user-response.dto';

import { api, bearer, createTestApp, registerUser } from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const usersPage = async (query: Record<string, unknown>) => {
  const viewer = await registerUser(app);
  const response = await api(app)
    .get('/api/users')
    .query(query)
    .set(bearer(viewer))
    .expect(200);

  return response.body as UserPageDto;
};

it('lists users newest first without emails or password hashes', async () => {
  const user = await registerUser(app, 'Listed');

  const page = await usersPage({ limit: 50 });
  const listed = page.items.find(({ id }) => id === user.id);

  expect(listed).toMatchObject({ userName: 'Listed' });
  expect(JSON.stringify(page)).not.toMatch(/"(email|password)"/);
});

it('pages through users with a cursor', async () => {
  const first = await usersPage({ limit: 2 });
  const second = await usersPage({ limit: 2, cursor: first.nextCursor });
  const firstIds = first.items.map(({ id }) => id);

  expect(first.items).toHaveLength(2);
  expect(first.nextCursor).toEqual(expect.any(String));
  expect(second.items.some(({ id }) => firstIds.includes(id))).toBe(false);
});

it('rejects a page larger than 50', async () => {
  const viewer = await registerUser(app);

  await api(app)
    .get('/api/users')
    .query({ limit: 51 })
    .set(bearer(viewer))
    .expect(400);
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
  await api(app).get('/api/users/not-a-uuid').set(bearer(viewer)).expect(400);
});
