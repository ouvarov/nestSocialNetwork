import type { NestExpressApplication } from '@nestjs/platform-express';

import type { ChatDto, ChatSummaryDto } from '@/chat/dto/chat-response.dto';

import {
  api,
  bearer,
  createChat,
  createTestApp,
  registerUser,
  type TestUser,
} from './support';

let app: NestExpressApplication;
let ada: TestUser;
let bob: TestUser;
let eve: TestUser;

beforeAll(async () => {
  app = await createTestApp();
  [ada, bob, eve] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
    registerUser(app, 'Eve'),
  ]);
});

afterAll(async () => {
  await app.close();
});

const chatsOf = async (user: TestUser) =>
  (await api(app).get('/api/chat').set(bearer(user)).expect(200))
    .body as ChatSummaryDto[];

describe('creating chats', () => {
  it('names a new chat after its members and shows it to each of them', async () => {
    const chatId = await createChat(app, ada, [bob]);

    for (const member of [ada, bob]) {
      expect(await chatsOf(member)).toContainEqual({
        chatId,
        chatName: 'Ada, Bob',
      });
    }
    expect((await chatsOf(eve)).map((chat) => chat.chatId)).not.toContain(
      chatId,
    );
  });

  it('returns the existing chat for the same members', async () => {
    const [carol, dan] = await Promise.all([
      registerUser(app, 'Carol'),
      registerUser(app, 'Dan'),
    ]);
    const chatId = await createChat(app, carol, [dan]);

    expect(await createChat(app, dan, [carol])).toBe(chatId);
    expect(await createChat(app, carol, [dan, eve])).not.toBe(chatId);
  });

  it.each([
    ['only yourself', () => [ada.id]],
    ['no members', () => []],
    ['an id that is not a UUID', () => ['42']],
  ])('rejects %s', async (_case, userIds) => {
    await api(app)
      .post('/api/chat/create')
      .set(bearer(ada))
      .send({ userIds: userIds() })
      .expect(400);
  });

  it('rejects a member that does not exist', async () => {
    await api(app)
      .post('/api/chat/create')
      .set(bearer(ada))
      .send({ userIds: ['00000000-0000-4000-8000-000000000000'] })
      .expect(404);
  });
});

describe('a chat', () => {
  let first: TestUser;
  let second: TestUser;
  let chatId: string;

  beforeEach(async () => {
    [first, second] = await Promise.all([
      registerUser(app, 'First'),
      registerUser(app, 'Second'),
    ]);
    chatId = await createChat(app, first, [second]);
  });

  it('opens with its name and no messages', async () => {
    const response = await api(app)
      .get(`/api/chat/find/${chatId}`)
      .set(bearer(second))
      .expect(200);

    expect(response.body as ChatDto).toEqual({
      chatName: 'First, Second',
      messages: [],
    });
  });

  it('can be renamed by a member', async () => {
    await api(app)
      .put('/api/chat/update')
      .set(bearer(second))
      .send({ chatId, newChatName: 'Weekend plans' })
      .expect(200, { chatId, chatName: 'Weekend plans' });
  });

  it('can be deleted by a member', async () => {
    await api(app).delete(`/api/chat/${chatId}`).set(bearer(first)).expect(204);

    await api(app)
      .get(`/api/chat/find/${chatId}`)
      .set(bearer(second))
      .expect(404);
    expect((await chatsOf(second)).map((chat) => chat.chatId)).not.toContain(
      chatId,
    );
  });

  it('looks like it does not exist to a non-member', async () => {
    await api(app).get(`/api/chat/find/${chatId}`).set(bearer(eve)).expect(404);
    await api(app)
      .put('/api/chat/update')
      .set(bearer(eve))
      .send({ chatId, newChatName: 'Mine now' })
      .expect(404);
    await api(app).delete(`/api/chat/${chatId}`).set(bearer(eve)).expect(404);

    await api(app)
      .get(`/api/chat/find/${chatId}`)
      .set(bearer(first))
      .expect(200);
  });
});
