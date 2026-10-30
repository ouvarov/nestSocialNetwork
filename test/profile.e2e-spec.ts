import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';

import type { AuthResponseDto } from '@/auth/dto/auth-response.dto';
import type { UploadResponseDto } from '@/upload/dto/upload-response.dto';
import type {
  FollowStateDto,
  ProfileResponseDto,
  UserPageDto,
  UserResponseDto,
} from '@/user/dto/user-response.dto';

import {
  api,
  bearer,
  createTestApp,
  refreshCookieOf,
  registerUser,
  removeUploads,
  type TestUser,
} from './support';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let app: NestExpressApplication;
const uploaders: TestUser[] = [];

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await Promise.all(uploaders.map(removeUploads));
  await app.close();
});

const profileOf = async (viewer: TestUser, user: TestUser) =>
  (await api(app).get(`/api/users/${user.id}`).set(bearer(viewer)).expect(200))
    .body as ProfileResponseDto;

const patchMe = (user: TestUser, body: object) =>
  api(app).patch('/api/users/me').set(bearer(user)).send(body);

const uploadAs = async (user: TestUser) => {
  uploaders.push(user);
  const response = await api(app)
    .post('/api/upload')
    .set(bearer(user))
    .attach('image', PNG, 'avatar.png')
    .expect(201);

  return response.body as UploadResponseDto;
};

const follow = (follower: TestUser, followee: TestUser) =>
  api(app).put(`/api/users/${followee.id}/follow`).set(bearer(follower));

const unfollow = (follower: TestUser, followee: TestUser) =>
  api(app).delete(`/api/users/${followee.id}/follow`).set(bearer(follower));

describe('PATCH /users/me', () => {
  it('shows the new name and bio right after a cached read', async () => {
    const user = await registerUser(app, 'Before');
    await profileOf(user, user);

    const updated = (
      await patchMe(user, {
        userName: '  After  ',
        description: 'Mathematician',
      }).expect(200)
    ).body as UserResponseDto;

    expect(updated).toMatchObject({
      userName: 'After',
      description: 'Mathematician',
    });
    expect(await profileOf(user, user)).toMatchObject({
      userName: 'After',
      description: 'Mathematician',
    });
  });

  it('sets and removes the avatar', async () => {
    const user = await registerUser(app);
    const { id, url } = await uploadAs(user);

    const withAvatar = (await patchMe(user, { avatarUploadId: id }).expect(200))
      .body as UserResponseDto;
    const withoutAvatar = (
      await patchMe(user, { avatarUploadId: null }).expect(200)
    ).body as UserResponseDto;

    expect(withAvatar.imageUrl).toBe(url);
    expect(withoutAvatar.imageUrl).toBeNull();
    await api(app).get(new URL(url).pathname).expect(404);
  });

  it('returns the avatar in the session after a refresh', async () => {
    const user = await registerUser(app);
    const { id, url } = await uploadAs(user);
    await patchMe(user, { avatarUploadId: id }).expect(200);

    const refreshed = await api(app)
      .post('/api/auth/refresh')
      .set('Cookie', user.refreshCookie)
      .expect(200);

    expect((refreshed.body as AuthResponseDto).userData.imageUrl).toBe(url);
    expect(refreshCookieOf(refreshed)).toEqual(expect.any(String));
  });

  it("rejects another user's upload as an avatar", async () => {
    const [user, other] = await Promise.all([
      registerUser(app),
      registerUser(app),
    ]);
    const { id } = await uploadAs(other);

    await patchMe(user, { avatarUploadId: id }).expect(400);
    await patchMe(user, { avatarUploadId: randomUUID() }).expect(400);
  });

  it.each([
    ['an empty name', { userName: '   ' }],
    ['a null name', { userName: null }],
    ['a name over 50 characters', { userName: 'a'.repeat(51) }],
    ['a bio over 300 characters', { description: 'a'.repeat(301) }],
    ['a null bio', { description: null }],
    ['an email', { email: 'x@example.com' }],
    ['a password', { password: 'correct-horse-battery' }],
  ])('rejects %s', async (_case, body) => {
    const user = await registerUser(app);

    await patchMe(user, body).expect(400);
  });

  it('needs a signed-in user', async () => {
    await api(app)
      .patch('/api/users/me')
      .send({ userName: 'Nobody' })
      .expect(401);
  });
});

describe('follows', () => {
  it('follows idempotently, also when two requests race', async () => {
    const [fan, star] = await Promise.all([
      registerUser(app),
      registerUser(app),
    ]);

    const [first, second] = await Promise.all([
      follow(fan, star).expect(200),
      follow(fan, star).expect(200),
    ]);

    const expected: FollowStateDto = {
      userId: star.id,
      isFollowedByMe: true,
      followersCount: 1,
      followingCount: 0,
    };
    expect(first.body).toEqual(expected);
    expect(second.body).toEqual(expected);
  });

  it('updates both cached profiles', async () => {
    const [fan, star] = await Promise.all([
      registerUser(app),
      registerUser(app),
    ]);
    await profileOf(fan, star);
    await profileOf(fan, fan);

    await follow(fan, star).expect(200);

    expect(await profileOf(fan, star)).toMatchObject({
      followersCount: 1,
      isFollowedByMe: true,
    });
    expect(await profileOf(fan, fan)).toMatchObject({ followingCount: 1 });
    expect(await profileOf(star, star)).toMatchObject({
      followersCount: 1,
      isFollowedByMe: false,
    });
  });

  it('unfollows idempotently', async () => {
    const [fan, star] = await Promise.all([
      registerUser(app),
      registerUser(app),
    ]);
    await follow(fan, star).expect(200);

    await unfollow(fan, star).expect(200);
    const again = await unfollow(fan, star).expect(200);

    expect(again.body).toMatchObject({
      isFollowedByMe: false,
      followersCount: 0,
    });
  });

  it('marks followed people in the people list', async () => {
    const [fan, star] = await Promise.all([
      registerUser(app),
      registerUser(app),
    ]);
    await follow(fan, star).expect(200);

    const page = (
      await api(app)
        .get('/api/users')
        .query({ limit: 50 })
        .set(bearer(fan))
        .expect(200)
    ).body as UserPageDto;

    expect(page.items.find(({ id }) => id === star.id)).toMatchObject({
      isFollowedByMe: true,
      followersCount: 1,
    });
  });

  it('refuses to follow yourself, unknown people and malformed ids', async () => {
    const user = await registerUser(app);

    await follow(user, user).expect(400);
    await api(app)
      .put(`/api/users/${randomUUID()}/follow`)
      .set(bearer(user))
      .expect(404);
    await api(app)
      .put('/api/users/not-a-uuid/follow')
      .set(bearer(user))
      .expect(400);
  });

  it('needs a signed-in user', async () => {
    const user = await registerUser(app);

    await api(app).put(`/api/users/${user.id}/follow`).expect(401);
  });
});
