import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';

import type {
  FeedItemDto,
  FeedPageDto,
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
let viewer: TestUser;
let followed: TestUser;
let stranger: TestUser;
const posts: Record<string, PostResponseDto> = {};

beforeAll(async () => {
  app = await createTestApp();
  viewer = await registerUser(app, 'Viewer');
  followed = await registerUser(app, 'Followed');
  stranger = await registerUser(app, 'Stranger');

  await api(app)
    .put(`/api/users/${followed.id}/follow`)
    .set(bearer(viewer))
    .expect(200);

  posts.strangerOld = await createPost(app, stranger, textOf('stranger old'));
  posts.followedOld = await createPost(app, followed, textOf('followed old'));
  posts.strangerNew = await createPost(app, stranger, textOf('stranger new'));
  posts.own = await createPost(app, viewer, textOf('own'));
  posts.followedNew = await createPost(app, followed, textOf('followed new'));
});

afterAll(async () => {
  await app.close();
});

const RUN = randomUUID().slice(0, 8);

const textOf = (label: string) => `${RUN} ${label}`;

const feedPage = async (
  query: Record<string, unknown> = {},
  as: TestUser = viewer,
) =>
  (await api(app).get('/api/feed').query(query).set(bearer(as)).expect(200))
    .body as FeedPageDto;

const ours = (items: FeedItemDto[]) =>
  items
    .filter(({ text }) => text.startsWith(`${RUN} `))
    .map((item) => ({ ...item, text: item.text.slice(RUN.length + 1) }));

const MAX_FEED_PAGES = 200;

const readWholeFeed = async (limit: number) => {
  const items: FeedItemDto[] = [];
  let cursor: string | null | undefined;
  let pages = 0;

  do {
    const page = await feedPage({ limit, cursor: cursor ?? undefined });
    items.push(...page.items);
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor && pages < MAX_FEED_PAGES);

  expect(cursor).toBeNull();
  return items;
};

it('shows followed people and own posts first, then everyone else', async () => {
  const { items } = await feedPage({ limit: 50 });

  expect(
    ours(items).map(({ text, fromFollowing }) => [text, fromFollowing]),
  ).toEqual([
    ['followed new', true],
    ['own', true],
    ['followed old', true],
    ['stranger new', false],
    ['stranger old', false],
  ]);
});

it('sends the author with every post', async () => {
  const { items } = await feedPage({ limit: 50 });

  expect(items.find(({ id }) => id === posts.followedNew.id)?.author).toEqual({
    id: followed.id,
    userName: 'Followed',
    imageUrl: null,
  });
});

it('pages across both sections without gaps or repeats', async () => {
  const whole = (await feedPage({ limit: 50 })).items.map(({ id }) => id);
  const paged = (await readWholeFeed(2)).map(({ id }) => id);

  expect(paged.slice(0, whole.length)).toEqual(whole);
  expect(new Set(paged).size).toBe(paged.length);
});

it('keeps pages stable while new posts arrive, and shows them after a refresh', async () => {
  const firstPage = await feedPage({ limit: 2 });
  await createPost(app, followed, textOf('followed newest'));
  await createPost(app, stranger, textOf('stranger newest'));

  const rest: FeedItemDto[] = [];
  let cursor = firstPage.nextCursor;
  while (cursor) {
    const page = await feedPage({ limit: 2, cursor });
    rest.push(...page.items);
    cursor = page.nextCursor;
  }
  const refreshed = await feedPage({ limit: 50 });

  const seenTexts = ours([...firstPage.items, ...rest]).map(({ text }) => text);
  expect(seenTexts).not.toContain('followed newest');
  expect(seenTexts).not.toContain('stranger newest');
  expect(ours(refreshed.items).map(({ text }) => text)).toEqual([
    'followed newest',
    'followed new',
    'own',
    'followed old',
    'stranger newest',
    'stranger new',
    'stranger old',
  ]);
});

it('keeps someone followed mid-scroll in the second section until a refresh', async () => {
  const reader = await registerUser(app, 'Reader');
  const firstPage = await feedPage({ limit: 1 }, reader);
  await api(app)
    .put(`/api/users/${stranger.id}/follow`)
    .set(bearer(reader))
    .expect(200);

  const nextPage = await feedPage(
    { limit: 50, cursor: firstPage.nextCursor },
    reader,
  );
  const refreshed = await feedPage({ limit: 50 }, reader);

  expect(
    nextPage.items.find(({ id }) => id === posts.strangerNew.id)?.fromFollowing,
  ).toBe(false);
  expect(
    refreshed.items.find(({ id }) => id === posts.strangerNew.id)
      ?.fromFollowing,
  ).toBe(true);
});

it('rejects a broken cursor and a missing token', async () => {
  await api(app)
    .get('/api/feed')
    .query({ cursor: 'not-a-cursor' })
    .set(bearer(viewer))
    .expect(400);
  await api(app)
    .get('/api/feed')
    .query({
      cursor: Buffer.from(
        JSON.stringify({ tier: 2, createdAt: 'x', id: 'y', since: 'z' }),
      ).toString('base64url'),
    })
    .set(bearer(viewer))
    .expect(400);
  await api(app).get('/api/feed').expect(401);
});

describe('editing posts', () => {
  it('changes the text of your own post and marks it edited', async () => {
    const post = await createPost(app, viewer, 'typo');

    const edited = (
      await api(app)
        .patch(`/api/posts/${post.id}`)
        .set(bearer(viewer))
        .send({ text: 'fixed' })
        .expect(200)
    ).body as PostResponseDto;

    expect(edited).toMatchObject({ id: post.id, text: 'fixed' });
    expect(edited.editedAt).toEqual(expect.any(String));
  });

  it("answers 404 for someone else's post", async () => {
    await api(app)
      .patch(`/api/posts/${posts.followedOld.id}`)
      .set(bearer(viewer))
      .send({ text: 'hijacked' })
      .expect(404);
  });

  it.each([
    ['empty text', { text: '' }],
    [
      'an image change',
      { text: 'x', imageUploadId: '00000000-0000-4000-8000-000000000000' },
    ],
  ])('rejects %s', async (_case, body) => {
    await api(app)
      .patch(`/api/posts/${posts.own.id}`)
      .set(bearer(viewer))
      .send(body)
      .expect(400);
  });
});
