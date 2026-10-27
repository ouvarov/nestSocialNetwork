import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Socket } from 'socket.io-client';

import type { ChatDto, ChatMessageDto } from '@/chat/dto/chat-response.dto';

import {
  api,
  bearer,
  connectSocket,
  createChat,
  createTestApp,
  nextEvent,
  registerUser,
  type TestUser,
} from './support';

type Exception = { status: string; message: unknown };
type NewMessage = ChatMessageDto & { chatId: string };

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
  chatId = await createChat(app, ada, [bob]);
});

afterEach(() => {
  sockets.splice(0).forEach((socket) => socket.disconnect());
});

afterAll(async () => {
  await app.close();
});

const connect = async (user: TestUser) => {
  const socket = connectSocket(app, user.accessToken);
  sockets.push(socket);
  await nextEvent(socket, 'connect');

  return socket;
};

const emit = <T>(socket: Socket, event: string, payload: unknown) =>
  socket.timeout(5000).emitWithAck(event, payload) as Promise<T>;

const exceptionOf = (socket: Socket, event: string, payload: unknown) => {
  const exception = nextEvent<Exception>(socket, 'exception');
  socket.emit(event, payload);

  return exception;
};

describe('connecting', () => {
  it.each([
    ['without a token', undefined],
    ['with a forged token', 'eyJhbGciOiJIUzI1NiJ9.e30.forged'],
  ])('is refused %s', async (_case, token) => {
    const socket = connectSocket(app, token);
    sockets.push(socket);
    const exception = nextEvent<Exception>(socket, 'exception');
    const disconnect = nextEvent<string>(socket, 'disconnect');

    expect(await exception).toEqual({
      status: 'error',
      message: 'Unauthorized',
    });
    expect(await disconnect).toBe('io server disconnect');
  });

  it('is refused with a refresh token', async () => {
    const socket = connectSocket(
      app,
      ada.refreshCookie.replace('refresh_token=', ''),
    );
    sockets.push(socket);

    expect(await nextEvent(socket, 'disconnect')).toBe('io server disconnect');
  });
});

describe('messages', () => {
  it('reach every member in the room and are saved', async () => {
    const [adaSocket, bobSocket, eveSocket] = await Promise.all([
      connect(ada),
      connect(bob),
      connect(eve),
    ]);
    await emit(adaSocket, 'joinChat', { chatId });
    await emit(bobSocket, 'joinChat', { chatId });
    const eveMessages: unknown[] = [];
    eveSocket.on('newMessage', (message) => eveMessages.push(message));

    const received = nextEvent<NewMessage>(bobSocket, 'newMessage');
    const sent = await emit<NewMessage>(adaSocket, 'createMessage', {
      chatId,
      content: 'Hi Bob',
    });

    expect(sent).toMatchObject({ chatId, senderId: ada.id, content: 'Hi Bob' });
    expect(await received).toEqual(sent);

    const chat = (
      await api(app).get(`/api/chat/find/${chatId}`).set(bearer(bob))
    ).body as ChatDto;
    expect(chat.messages.map(({ messageId }) => messageId)).toContain(
      sent.messageId,
    );
    expect(eveMessages).toEqual([]);
  });

  it('cannot be read by joining a chat you are not in', async () => {
    const socket = await connect(eve);

    expect(await exceptionOf(socket, 'joinChat', { chatId })).toMatchObject({
      status: 'error',
      statusCode: 404,
    });
  });

  it('cannot be sent to a chat you are not in', async () => {
    const socket = await connect(eve);

    expect(
      await exceptionOf(socket, 'createMessage', { chatId, content: 'Hi' }),
    ).toMatchObject({ statusCode: 404 });
  });

  it.each([
    ['empty', { content: '' }],
    ['too long', { content: 'a'.repeat(2001) }],
    ['for a malformed chat id', { chatId: '42', content: 'Hi' }],
  ])('are rejected when %s', async (_case, override) => {
    const socket = await connect(ada);

    expect(
      await exceptionOf(socket, 'createMessage', {
        chatId,
        ...override,
      }),
    ).toMatchObject({ statusCode: 400 });
  });
});
