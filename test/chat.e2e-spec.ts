import type { NestExpressApplication } from '@nestjs/platform-express';

import type {
  ChatDto,
  ChatIdDto,
  ChatSummaryDto,
  MessagePageDto,
} from '@/chat/dto/chat-response.dto';

import {
  api,
  bearer,
  createChat,
  createTestApp,
  registerUser,
  sendMessage,
  type TestUser,
} from './support';

let app: NestExpressApplication;
let eve: TestUser;

beforeAll(async () => {
  app = await createTestApp();
  eve = await registerUser(app, 'Eve');
});

afterAll(async () => {
  await app.close();
});

const chatsOf = async (user: TestUser) =>
  (await api(app).get('/api/chat').set(bearer(user)).expect(200))
    .body as ChatSummaryDto[];

const chatIdsOf = async (user: TestUser) =>
  (await chatsOf(user)).map(({ chatId }) => chatId);

const messagesOf = async (user: TestUser, chatId: string, query = {}) =>
  (
    await api(app)
      .get(`/api/chat/${chatId}/messages`)
      .query(query)
      .set(bearer(user))
      .expect(200)
  ).body as MessagePageDto;

const registerPair = () =>
  Promise.all([registerUser(app, 'Ada'), registerUser(app, 'Bob')]);

describe('creating chats', () => {
  it('shows a new chat to both people with the other one as the peer', async () => {
    const [ada, bob] = await registerPair();

    const chatId = await createChat(app, ada, bob);

    expect(await chatsOf(ada)).toContainEqual({
      chatId,
      peer: { id: bob.id, userName: 'Bob', imageUrl: null },
      lastMessageAt: null,
    });
    expect(await chatsOf(bob)).toContainEqual(
      expect.objectContaining({
        chatId,
        peer: expect.objectContaining({ id: ada.id }) as unknown,
      }),
    );
    expect(await chatIdsOf(eve)).not.toContain(chatId);
  });

  it('returns the existing chat whoever starts it', async () => {
    const [ada, bob] = await registerPair();
    const chatId = await createChat(app, ada, bob);

    expect(await createChat(app, bob, ada)).toBe(chatId);
  });

  it('creates one chat when both requests arrive at once', async () => {
    const [ada, bob] = await registerPair();

    const chatIds = await Promise.all([
      createChat(app, ada, bob),
      createChat(app, bob, ada),
      createChat(app, ada, bob),
    ]);

    expect(new Set(chatIds).size).toBe(1);
    expect(await chatIdsOf(ada)).toEqual([chatIds[0]]);
  });

  it.each([
    ['yourself', () => eve.id],
    ['an id that is not a UUID', () => '42'],
  ])('rejects a chat with %s', async (_case, userId) => {
    await api(app)
      .post('/api/chat/create')
      .set(bearer(eve))
      .send({ userId: userId() })
      .expect(400);
  });

  it('rejects the old body with a list of members', async () => {
    const [ada, bob] = await registerPair();

    await api(app)
      .post('/api/chat/create')
      .set(bearer(ada))
      .send({ userIds: [bob.id] })
      .expect(400);
  });

  it('answers 404 for a user that does not exist', async () => {
    await api(app)
      .post('/api/chat/create')
      .set(bearer(eve))
      .send({ userId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
  });
});

describe('a chat', () => {
  let ada: TestUser;
  let bob: TestUser;
  let chatId: string;

  beforeEach(async () => {
    [ada, bob] = await registerPair();
    chatId = await createChat(app, ada, bob);
  });

  it('opens with the peer and permission to send', async () => {
    const response = await api(app)
      .get(`/api/chat/find/${chatId}`)
      .set(bearer(bob))
      .expect(200);

    expect(response.body as ChatDto).toEqual({
      chatId,
      peer: { id: ada.id, userName: 'Ada', imageUrl: null },
      canSend: true,
    });
  });

  it('pages through the history newest first', async () => {
    for (const content of ['one', 'two', 'three']) {
      await sendMessage(app, ada, chatId, content);
    }

    const firstPage = await messagesOf(bob, chatId, { limit: 2 });
    const secondPage = await messagesOf(bob, chatId, {
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(firstPage.items.map(({ content }) => content)).toEqual([
      'three',
      'two',
    ]);
    expect(secondPage.items.map(({ content }) => content)).toEqual(['one']);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('moves to the top of the list on a new message', async () => {
    const carol = await registerUser(app, 'Carol');
    const olderChatId = chatId;
    const newerChatId = await createChat(app, ada, carol);

    await sendMessage(app, bob, olderChatId, 'Bump');

    expect((await chatIdsOf(ada)).slice(0, 2)).toEqual([
      olderChatId,
      newerChatId,
    ]);
  });

  it('has no rename endpoint', async () => {
    await api(app)
      .put('/api/chat/update')
      .set(bearer(ada))
      .send({ chatId, newChatName: 'Weekend plans' })
      .expect(404);
  });

  describe('delete for me', () => {
    it('hides the chat and its history only for the one who deleted it', async () => {
      await sendMessage(app, ada, chatId, 'Hi Bob');

      await api(app).delete(`/api/chat/${chatId}`).set(bearer(ada)).expect(204);

      expect(await chatIdsOf(ada)).not.toContain(chatId);
      expect((await messagesOf(ada, chatId)).items).toEqual([]);
      expect(await chatIdsOf(bob)).toContain(chatId);
      expect(
        (await messagesOf(bob, chatId)).items.map(({ content }) => content),
      ).toEqual(['Hi Bob']);
    });

    it('brings the chat back with only the new messages', async () => {
      await sendMessage(app, ada, chatId, 'Before');
      await api(app).delete(`/api/chat/${chatId}`).set(bearer(ada)).expect(204);

      await sendMessage(app, bob, chatId, 'After');

      expect(await chatIdsOf(ada)).toContain(chatId);
      expect(
        (await messagesOf(ada, chatId)).items.map(({ content }) => content),
      ).toEqual(['After']);
    });

    it('returns the same chat when you start it again', async () => {
      await api(app).delete(`/api/chat/${chatId}`).set(bearer(ada)).expect(204);

      const response = await api(app)
        .post('/api/chat/create')
        .set(bearer(ada))
        .send({ userId: bob.id })
        .expect(201);

      expect((response.body as ChatIdDto).chatId).toBe(chatId);
    });

    it('removes the chat once both people deleted it', async () => {
      await sendMessage(app, ada, chatId, 'Hi Bob');

      await api(app).delete(`/api/chat/${chatId}`).set(bearer(ada)).expect(204);
      await api(app).delete(`/api/chat/${chatId}`).set(bearer(bob)).expect(204);

      await api(app)
        .get(`/api/chat/find/${chatId}`)
        .set(bearer(bob))
        .expect(404);
      expect(await createChat(app, ada, bob)).not.toBe(chatId);
    });
  });

  it('looks like it does not exist to a non-member', async () => {
    await api(app).get(`/api/chat/find/${chatId}`).set(bearer(eve)).expect(404);
    await api(app)
      .get(`/api/chat/${chatId}/messages`)
      .set(bearer(eve))
      .expect(404);
    await api(app).delete(`/api/chat/${chatId}`).set(bearer(eve)).expect(404);

    await api(app).get(`/api/chat/find/${chatId}`).set(bearer(ada)).expect(200);
  });
});
