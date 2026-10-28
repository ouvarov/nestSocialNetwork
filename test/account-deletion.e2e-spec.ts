import type { NestExpressApplication } from '@nestjs/platform-express';
import { eq } from 'drizzle-orm';

import type {
  ChatDto,
  ChatSummaryDto,
  MessagePageDto,
} from '@/chat/dto/chat-response.dto';
import { DRIZZLE, type Database } from '@/database/drizzle';
import { Chats } from '@/database/schemas/chats.schema';
import type { PostResponseDto } from '@/post/dto/post-response.dto';

import {
  PASSWORD,
  api,
  bearer,
  connectSocket,
  createChat,
  createPost,
  createTestApp,
  deleteAccount,
  nextEvent,
  registerUser,
  sendMessage,
} from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const chatExists = async (chatId: string) => {
  const rows = await app
    .get<Database>(DRIZZLE)
    .select({ chatId: Chats.chat_id })
    .from(Chats)
    .where(eq(Chats.chat_id, chatId));

  return rows.length > 0;
};

const registerPair = () =>
  Promise.all([registerUser(app, 'Staying'), registerUser(app, 'Leaving')]);

it('keeps the messages in the chat of the other person without a sender', async () => {
  const [staying, leaving] = await registerPair();
  const chatId = await createChat(app, staying, leaving);
  await sendMessage(app, leaving, chatId, 'Goodbye');
  await sendMessage(app, staying, chatId, 'Bye');

  await deleteAccount(app, leaving);

  const chats = (await api(app).get('/api/chat').set(bearer(staying)))
    .body as ChatSummaryDto[];
  const chat = (
    await api(app).get(`/api/chat/find/${chatId}`).set(bearer(staying))
  ).body as ChatDto;
  const history = (
    await api(app).get(`/api/chat/${chatId}/messages`).set(bearer(staying))
  ).body as MessagePageDto;

  expect(chats.find((summary) => summary.chatId === chatId)?.peer).toBeNull();
  expect(chat).toEqual({ chatId, peer: null, canSend: false });
  expect(
    history.items.map(({ senderId, content }) => ({ senderId, content })),
  ).toEqual([
    { senderId: staying.id, content: 'Bye' },
    { senderId: null, content: 'Goodbye' },
  ]);
});

it('removes the posts and likes of the account', async () => {
  const [staying, leaving] = await registerPair();
  const ownPost = await createPost(app, leaving);
  const likedPost = await createPost(app, staying);
  await api(app)
    .put(`/api/posts/${likedPost.id}/like`)
    .set(bearer(leaving))
    .expect(200);

  await deleteAccount(app, leaving);

  await api(app)
    .put(`/api/posts/${ownPost.id}/like`)
    .set(bearer(staying))
    .expect(404);
  const unliked = await api(app)
    .delete(`/api/posts/${likedPost.id}/like`)
    .set(bearer(staying))
    .expect(200);
  expect((unliked.body as PostResponseDto).likeCount).toBe(0);
});

it('signs the account out everywhere', async () => {
  const [, leaving] = await registerPair();
  const socket = connectSocket(app, leaving.accessToken);
  await nextEvent(socket, 'connect');
  const socketClosed = nextEvent(socket, 'disconnect');

  const response = await deleteAccount(app, leaving);

  expect(await socketClosed).toBe('io server disconnect');
  expect(String(response.headers['set-cookie'])).toMatch(/refresh_token=;/);
  await api(app)
    .post('/api/auth/refresh')
    .set('Cookie', leaving.refreshCookie)
    .expect(401);
  await api(app)
    .post('/api/auth/login')
    .send({ email: leaving.email, password: PASSWORD })
    .expect(401);
  await api(app)
    .get(`/api/users/${leaving.id}`)
    .set(bearer(leaving))
    .expect(404);
});

it('removes a chat once both people deleted their accounts', async () => {
  const [first, second] = await registerPair();
  const chatId = await createChat(app, first, second);
  await sendMessage(app, first, chatId, 'Hi');

  await deleteAccount(app, first);
  expect(await chatExists(chatId)).toBe(true);
  await deleteAccount(app, second);

  expect(await chatExists(chatId)).toBe(false);
});

it('removes a chat the other person already deleted for themselves', async () => {
  const [staying, leaving] = await registerPair();
  const chatId = await createChat(app, staying, leaving);
  await sendMessage(app, leaving, chatId, 'Hi');
  await api(app).delete(`/api/chat/${chatId}`).set(bearer(staying)).expect(204);

  await deleteAccount(app, leaving);

  expect(await chatExists(chatId)).toBe(false);
});

it('keeps the account when the password is wrong', async () => {
  const [, leaving] = await registerPair();

  await api(app)
    .delete('/api/users/me')
    .set(bearer(leaving))
    .send({ password: 'wrong-password' })
    .expect(403, {
      statusCode: 403,
      message: 'Wrong password',
      error: 'Forbidden',
    });
  await api(app)
    .post('/api/auth/login')
    .send({ email: leaving.email, password: PASSWORD })
    .expect(200);
});

it('needs the password', async () => {
  const [, leaving] = await registerPair();

  await api(app)
    .delete('/api/users/me')
    .set(bearer(leaving))
    .send({})
    .expect(400);
});
