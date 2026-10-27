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
  const { url } = response.body as UploadResponseDto;

  expect(url).toMatch(new RegExp(`/uploads/users/${user.id}/[\\w-]+\\.png$`));

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
  const { url } = (await upload(user, PNG).expect(201))
    .body as UploadResponseDto;

  const post = (
    await api(app)
      .post('/api/posts')
      .set(bearer(user))
      .send({ text: 'With a picture', imageUrl: url })
      .expect(201)
  ).body as PostResponseDto;
  expect(post.imageUrl).toBe(url);

  await api(app)
    .post('/api/posts')
    .set(bearer(other))
    .send({ text: 'Borrowed picture', imageUrl: url })
    .expect(400);
});
