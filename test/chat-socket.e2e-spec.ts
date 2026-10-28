import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Socket } from 'socket.io-client';

import type {
  ChatMessageDto,
  MessagePageDto,
} from '@/chat/dto/chat-response.dto';
import type { ErrorAck } from '@/common/filters/all-exceptions.filter';

import {
  api,
  bearer,
  connectSocket,
  createChat,
  createTestApp,
  deleteAccount,
  emitWithAck,
  nextEvent,
  registerUser,
  type TestUser,
} from './support';

type NewMessage = ChatMessageDto & { chatId: string };
type Ack<Data> = { ok: true; data: Data } | ErrorAck;

let app: NestExpressApplication;
let ada: TestUser;
let bob: TestUser;
let eve: TestUser;
let chatId: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  app = await createTestApp();
  [ada, bob, eve] = await Promise.all([
    registerUser(app, 'Ada'),
    registerUser(app, 'Bob'),
    registerUser(app, 'Eve'),
  ]);
  chatId = await createChat(app, ada, bob);
});

afterEach(() => {
  sockets.splice(0).forEach((socket) => socket.disconnect());
});

afterAll(async () => {
  await app.close();
});

const track = (socket: Socket) => {
  sockets.push(socket);
  return socket;
};

const connect = async (user: TestUser, token = user.accessToken) => {
  const socket = track(connectSocket(app, token));
  await nextEvent(socket, 'connect');

  return socket;
};

const send = (socket: Socket, content: string, targetChatId = chatId) =>
  emitWithAck<Ack<NewMessage>>(socket, 'createMessage', {
    chatId: targetChatId,
    content,
  });

describe('connecting', () => {
  it.each([
    ['without a token', undefined],
    ['with a forged token', 'eyJhbGciOiJIUzI1NiJ9.e30.forged'],
  ])('is refused %s', async (_case, token) => {
    const socket = track(connectSocket(app, token));

    expect(await nextEvent<Error>(socket, 'connect_error')).toMatchObject({
      message: 'Unauthorized',
    });
  });

  it('is refused with a refresh token', async () => {
    const socket = track(
      connectSocket(app, ada.refreshCookie.replace('refresh_token=', '')),
    );

    expect(await nextEvent<Error>(socket, 'connect_error')).toMatchObject({
      message: 'Unauthorized',
    });
  });

  it('is closed by the server when the access token expires', async () => {
    const shortLivedToken = app
      .get(JwtService)
      .sign({ sub: ada.id, typ: 'access' }, { expiresIn: 1 });
    const socket = await connect(ada, shortLivedToken);

    expect(await nextEvent(socket, 'disconnect', 3000)).toBe(
      'io server disconnect',
    );
  });

  it('is closed for every device of the user on logout', async () => {
    const user = await registerUser(app, 'Leaving');
    const [phone, laptop] = await Promise.all([connect(user), connect(user)]);
    const phoneClosed = nextEvent(phone, 'disconnect');
    const laptopClosed = nextEvent(laptop, 'disconnect');

    await api(app)
      .post('/api/auth/logout')
      .set('Cookie', user.refreshCookie)
      .expect(204);

    expect(await phoneClosed).toBe('io server disconnect');
    expect(await laptopClosed).toBe('io server disconnect');
  });
});

describe('messages', () => {
  it('reach every member in the room and are saved', async () => {
    const [adaSocket, bobSocket, eveSocket] = await Promise.all([
      connect(ada),
      connect(bob),
      connect(eve),
    ]);
    await emitWithAck(adaSocket, 'joinChat', { chatId });
    await emitWithAck(bobSocket, 'joinChat', { chatId });
    const eveMessages: unknown[] = [];
    eveSocket.on('newMessage', (message) => eveMessages.push(message));

    const received = nextEvent<NewMessage>(bobSocket, 'newMessage');
    const sent = await send(adaSocket, 'Hi Bob');

    if (!sent.ok) throw new Error(sent.error.message);
    expect(sent.data).toMatchObject({
      chatId,
      senderId: ada.id,
      content: 'Hi Bob',
    });
    expect(await received).toEqual(sent.data);

    const history = (
      await api(app).get(`/api/chat/${chatId}/messages`).set(bearer(bob))
    ).body as MessagePageDto;
    expect(history.items.map(({ messageId }) => messageId)).toContain(
      sent.data.messageId,
    );
    expect(eveMessages).toEqual([]);
  });

  it('answer each of two parallel sends in its own ack', async () => {
    const socket = await connect(ada);

    const [valid, invalid] = await Promise.all([
      send(socket, 'Valid'),
      send(socket, ''),
    ]);

    expect(valid).toMatchObject({ ok: true, data: { content: 'Valid' } });
    expect(invalid).toMatchObject({ ok: false, error: { statusCode: 400 } });
  });

  it('cannot be read by joining a chat you are not in', async () => {
    const socket = await connect(eve);

    expect(await emitWithAck(socket, 'joinChat', { chatId })).toEqual({
      ok: false,
      error: { statusCode: 404, message: 'Chat not found' },
    });
  });

  it('cannot be sent to a chat you are not in', async () => {
    const socket = await connect(eve);

    expect(await send(socket, 'Hi')).toMatchObject({
      ok: false,
      error: { statusCode: 404 },
    });
  });

  it('cannot be sent once the other person deleted their account', async () => {
    const [sender, leaver] = await Promise.all([
      registerUser(app, 'Sender'),
      registerUser(app, 'Leaver'),
    ]);
    const directChatId = await createChat(app, sender, leaver);
    await deleteAccount(app, leaver);
    const socket = await connect(sender);

    expect(await send(socket, 'Still there?', directChatId)).toEqual({
      ok: false,
      error: { statusCode: 410, message: 'User deleted' },
    });
  });

  it.each([
    ['empty', { content: '' }],
    ['too long', { content: 'a'.repeat(2001) }],
    ['for a malformed chat id', { chatId: '42', content: 'Hi' }],
  ])('are rejected when %s', async (_case, override) => {
    const socket = await connect(ada);

    expect(
      await emitWithAck(socket, 'createMessage', { chatId, ...override }),
    ).toMatchObject({ ok: false, error: { statusCode: 400 } });
  });
});
