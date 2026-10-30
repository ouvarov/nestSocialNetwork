import type { NestExpressApplication } from '@nestjs/platform-express';

import type { PostResponseDto } from '@/post/dto/post-response.dto';
import type { UploadResponseDto } from '@/upload/dto/upload-response.dto';

import {
  api,
  bearer,
  createTestApp,
  registerUser,
  removeUploads,
  type TestUser,
} from './support';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let app: NestExpressApplication;
let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  app = await createTestApp();
  [user, other] = await Promise.all([
    registerUser(app, 'Uploader'),
    registerUser(app, 'Other'),
  ]);
});

afterAll(async () => {
  await Promise.all([removeUploads(user), removeUploads(other)]);
  await app.close();
});

const upload = (as: TestUser, data: Buffer, filename = 'image.png') =>
  api(app).post('/api/upload').set(bearer(as)).attach('image', data, filename);

it('stores an image under the user and serves it back', async () => {
  const response = await upload(user, PNG).expect(201);
  const { url, ...stored } = response.body as UploadResponseDto;

  expect(url).toMatch(new RegExp(`/uploads/users/${user.id}/[\\w-]+\\.png$`));
  expect(stored).toEqual({
    id: expect.any(String) as string,
    width: 1,
    height: 1,
  });

  const served = await api(app)
    .get(new URL(url).pathname)
    .buffer(true)
    .expect(200);
  expect(served.headers['content-type']).toBe('image/png');
  expect(Buffer.compare(served.body as Buffer, PNG)).toBe(0);
});

it('detects the type from the bytes, not the file name', async () => {
  await upload(user, Buffer.from('<svg onload="alert(1)"/>'), 'x.png').expect(
    415,
  );
});

it('rejects a request without a file', async () => {
  await api(app).post('/api/upload').set(bearer(user)).expect(400);
});

it('rejects files over 5 MB', async () => {
  const large = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);

  await upload(user, large).expect(413);
});

it('needs a signed-in user', async () => {
  await api(app).post('/api/upload').attach('image', PNG, 'a.png').expect(401);
});

it("accepts the uploaded image in a post, but not in another user's post", async () => {
  const { id, url } = (await upload(user, PNG).expect(201))
    .body as UploadResponseDto;

  const post = (
    await api(app)
      .post('/api/posts')
      .set(bearer(user))
      .send({ text: 'With a picture', imageUploadId: id })
      .expect(201)
  ).body as PostResponseDto;
  expect(post).toMatchObject({ imageUrl: url, imageWidth: 1, imageHeight: 1 });

  await api(app)
    .post('/api/posts')
    .set(bearer(other))
    .send({ text: 'Borrowed picture', imageUploadId: id })
    .expect(400);
});

it('removes the image file when its post is deleted', async () => {
  const { id, url } = (await upload(user, PNG).expect(201))
    .body as UploadResponseDto;
  const post = (
    await api(app)
      .post('/api/posts')
      .set(bearer(user))
      .send({ text: 'Short-lived picture', imageUploadId: id })
      .expect(201)
  ).body as PostResponseDto;

  await api(app).delete(`/api/posts/${post.id}`).set(bearer(user)).expect(204);

  await api(app).get(new URL(url).pathname).expect(404);
});

it('keeps an image that is still the avatar when its post is deleted', async () => {
  const { id, url } = (await upload(user, PNG).expect(201))
    .body as UploadResponseDto;
  await api(app)
    .patch('/api/users/me')
    .set(bearer(user))
    .send({ avatarUploadId: id })
    .expect(200);
  const post = (
    await api(app)
      .post('/api/posts')
      .set(bearer(user))
      .send({ text: 'Avatar and post', imageUploadId: id })
      .expect(201)
  ).body as PostResponseDto;

  await api(app).delete(`/api/posts/${post.id}`).set(bearer(user)).expect(204);

  await api(app).get(new URL(url).pathname).expect(200);
});
