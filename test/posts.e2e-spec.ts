import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';

import type {
  PostPageDto,
  PostResponseDto,
} from '@/post/dto/post-response.dto';

import {
  api,
  bearer,
  createPost,
  createTestApp,
  registerUser,
  type TestUser,
} from './support';

let app: NestExpressApplication;
let author: TestUser;
let reader: TestUser;

beforeAll(async () => {
  app = await createTestApp();
  [author, reader] = await Promise.all([
    registerUser(app, 'Author'),
    registerUser(app, 'Reader'),
  ]);
});

afterAll(async () => {
  await app.close();
});

const postsOf = (owner: TestUser, viewer: TestUser, query = {}) =>
  api(app).get(`/api/users/${owner.id}/posts`).set(bearer(viewer)).query(query);

const cursorOf = (
  createdAt: string,
  id = '00000000-0000-4000-8000-000000000000',
) => Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url');

describe('creating posts', () => {
  it('returns the new post without likes', async () => {
    const post = await createPost(app, author, 'First post');

    expect(post).toEqual({
      id: expect.any(String) as string,
      ownerId: author.id,
      author: { id: author.id, userName: author.userName, imageUrl: null },
      imageUrl: null,
      imageWidth: null,
      imageHeight: null,
      text: 'First post',
      created: expect.any(String) as string,
      editedAt: null,
      likeCount: 0,
      likedByMe: false,
    });
  });

  it.each([
    ['no text', {}],
    ['empty text', { text: '' }],
    ['text over 2000 characters', { text: 'a'.repeat(2001) }],
    [
      'an image upload id that is not a UUID',
      { text: 'Hi', imageUploadId: 'nope' },
    ],
    [
      'the old imageUrl field',
      { text: 'Hi', imageUrl: 'https://example.com/cat.png' },
    ],
  ])('rejects %s', async (_case, body) => {
    await api(app)
      .post('/api/posts')
      .set(bearer(author))
      .send(body)
      .expect(400);
  });

  it('rejects an upload id that does not exist', async () => {
    await api(app)
      .post('/api/posts')
      .set(bearer(author))
      .send({ text: 'Hi', imageUploadId: randomUUID() })
      .expect(400);
  });
});

describe('listing posts', () => {
  it('pages through posts newest first with a cursor', async () => {
    const owner = await registerUser(app, 'Pager');
    const created: PostResponseDto[] = [];
    for (const text of ['one', 'two', 'three']) {
      created.push(await createPost(app, owner, text));
    }

    const first = (await postsOf(owner, reader, { limit: 2 }).expect(200))
      .body as PostPageDto;
    expect(first.items.map(({ text }) => text)).toEqual(['three', 'two']);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = (
      await postsOf(owner, reader, {
        limit: 2,
        cursor: first.nextCursor,
      }).expect(200)
    ).body as PostPageDto;
    expect(second.items.map(({ text }) => text)).toEqual(['one']);
    expect(second.nextCursor).toBeNull();
  });

  it('returns an empty page for a user without posts', async () => {
    const response = await postsOf(reader, author).expect(200);

    expect(response.body).toEqual({ items: [], nextCursor: null });
  });

  it.each([
    ['a limit over 50', { limit: 51 }],
    ['a zero limit', { limit: 0 }],
    ['a cursor that is not base64 JSON', { cursor: 'garbage' }],
    ['a cursor with a broken date', { cursor: cursorOf('not-a-date') }],
    [
      'a cursor with an impossible date',
      { cursor: cursorOf('2026-13-45 00:00:00+00') },
    ],
    [
      'a cursor with a broken id',
      { cursor: cursorOf(new Date().toISOString(), 'x') },
    ],
  ])('rejects %s', async (_case, query) => {
    await postsOf(author, reader, query).expect(400);
  });
});

describe('likes', () => {
  it('counts each user once and reports likedByMe per viewer', async () => {
    const post = await createPost(app, author);
    const like = () =>
      api(app).put(`/api/posts/${post.id}/like`).set(bearer(reader));

    await like().expect(200);
    const liked = (await like().expect(200)).body as PostResponseDto;
    expect(liked).toMatchObject({ likeCount: 1, likedByMe: true });

    const { items } = (await postsOf(author, author).expect(200))
      .body as PostPageDto;
    expect(items.find(({ id }) => id === post.id)).toMatchObject({
      likeCount: 1,
      likedByMe: false,
    });

    const unliked = (
      await api(app)
        .delete(`/api/posts/${post.id}/like`)
        .set(bearer(reader))
        .expect(200)
    ).body as PostResponseDto;
    expect(unliked).toMatchObject({ likeCount: 0, likedByMe: false });
  });

  it('answers 404 for a post that does not exist', async () => {
    await api(app)
      .put('/api/posts/00000000-0000-4000-8000-000000000000/like')
      .set(bearer(reader))
      .expect(404);
  });
});

describe('deleting posts', () => {
  it("does not delete someone else's post", async () => {
    const post = await createPost(app, author);

    await api(app)
      .delete(`/api/posts/${post.id}`)
      .set(bearer(reader))
      .expect(404);
    await api(app)
      .put(`/api/posts/${post.id}/like`)
      .set(bearer(reader))
      .expect(200);
  });

  it('deletes your own post', async () => {
    const post = await createPost(app, author);

    await api(app)
      .delete(`/api/posts/${post.id}`)
      .set(bearer(author))
      .expect(204);
    await api(app)
      .put(`/api/posts/${post.id}/like`)
      .set(bearer(reader))
      .expect(404);
  });

  it('rejects an id that is not a UUID', async () => {
    await api(app).delete('/api/posts/42').set(bearer(author)).expect(400);
  });
});
