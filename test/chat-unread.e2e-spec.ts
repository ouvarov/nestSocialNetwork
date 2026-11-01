import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';

import type { ChatSummaryDto } from '@/chat/dto/chat-response.dto';

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

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const chatOf = async (user: TestUser, chatId: string) => {
  const chats = (await api(app).get('/api/chat').set(bearer(user)).expect(200))
    .body as ChatSummaryDto[];

  return chats.find((chat) => chat.chatId === chatId);
};

const markRead = (user: TestUser, chatId: string) =>
  api(app).post(`/api/chat/${chatId}/read`).set(bearer(user));

it('shows the last message and counts what the other person sent', async () => {
  const [ada, bob] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
  ]);
  const chatId = await createChat(app, ada, bob);

  await sendMessage(app, bob, chatId, 'Hi Ada');
  await sendMessage(app, bob, chatId, 'Are you there?');
  await sendMessage(app, ada, chatId, 'Yes!');

  expect(await chatOf(ada, chatId)).toMatchObject({
    lastMessage: { content: 'Yes!', senderId: ada.id },
    unreadCount: 2,
  });
  expect(await chatOf(bob, chatId)).toMatchObject({ unreadCount: 1 });
});

it('resets the count on read and counts only newer messages', async () => {
  const [ada, bob] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
  ]);
  const chatId = await createChat(app, ada, bob);
  await sendMessage(app, bob, chatId, 'One');

  await markRead(ada, chatId).expect(204);
  expect(await chatOf(ada, chatId)).toMatchObject({ unreadCount: 0 });

  await sendMessage(app, bob, chatId, 'Two');
  expect(await chatOf(ada, chatId)).toMatchObject({
    unreadCount: 1,
    lastMessage: { content: 'Two' },
  });
});

it('starts a new chat with nothing to read', async () => {
  const [ada, bob] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
  ]);
  const chatId = await createChat(app, ada, bob);

  expect(await chatOf(ada, chatId)).toMatchObject({
    lastMessage: null,
    unreadCount: 0,
  });
});

it('hides messages from before you cleared the chat', async () => {
  const [ada, bob] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
  ]);
  const chatId = await createChat(app, ada, bob);
  await sendMessage(app, bob, chatId, 'Old news');
  await api(app).delete(`/api/chat/${chatId}`).set(bearer(ada)).expect(204);

  await sendMessage(app, bob, chatId, 'Fresh start');

  expect(await chatOf(ada, chatId)).toMatchObject({
    lastMessage: { content: 'Fresh start' },
    unreadCount: 1,
  });
});

it("answers 404 when marking someone else's chat as read", async () => {
  const [ada, bob, eve] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
    registerUser(app, 'Eve'),
  ]);
  const chatId = await createChat(app, ada, bob);

  await markRead(eve, chatId).expect(404);
  await markRead(eve, randomUUID()).expect(404);
});
