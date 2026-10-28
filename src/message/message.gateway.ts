import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

import {
  type AccessTokenPayload,
  toAccessTokenUser,
} from '@/auth/access-token';
import {
  findSocketSession,
  getSocketUser,
  setSocketSession,
  type SocketSession,
} from '@/auth/socket-user';
import { ChatService } from '@/chat/chat.service';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { UserSocketsService } from '@/realtime/user-sockets.service';

import { ChatRoomDto } from './dto/chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

type SuccessAck<Data> = { ok: true; data: Data };

const SECOND_MS = 1000;

const chatRoom = (chatId: string) => `chat:${chatId}`;

const success = <Data>(data: Data): SuccessAck<Data> => ({ ok: true, data });

@UseFilters(AllExceptionsFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@WebSocketGateway({ namespace: '/chat' })
export class MessageGateway implements OnGatewayInit, OnGatewayConnection {
  private namespace: Namespace;

  constructor(
    private readonly messageService: MessageService,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly userSocketsService: UserSocketsService,
  ) {}

  afterInit(namespace: Namespace) {
    this.namespace = namespace;
    this.userSocketsService.attach(namespace);
    namespace.use((client, next) => {
      void this.authenticate(client).then((session) => {
        if (!session) return next(new Error('Unauthorized'));

        setSocketSession(client, session);
        next();
      });
    });
  }

  async handleConnection(client: Socket) {
    const session = findSocketSession(client);
    if (!session) return;

    const expiryTimer = setTimeout(
      () => client.disconnect(true),
      session.expiresAtEpochMs - Date.now(),
    );
    client.once('disconnect', () => clearTimeout(expiryTimer));

    await this.userSocketsService.register(client, session.user.id);
  }

  @SubscribeMessage('joinChat')
  async joinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() { chatId }: ChatRoomDto,
  ) {
    await this.chatService.assertMember(getSocketUser(client).id, chatId);
    await client.join(chatRoom(chatId));

    return success({ chatId });
  }

  @SubscribeMessage('leaveChat')
  async leaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() { chatId }: ChatRoomDto,
  ) {
    await client.leave(chatRoom(chatId));

    return success({ chatId });
  }

  @SubscribeMessage('createMessage')
  async createMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    const { id: senderId } = getSocketUser(client);
    await this.chatService.assertCanSend(senderId, createMessageDto.chatId);

    const message = await this.messageService.create(
      senderId,
      createMessageDto,
    );
    this.namespace
      .to(chatRoom(createMessageDto.chatId))
      .emit('newMessage', message);

    return success(message);
  }

  private async authenticate(client: Socket): Promise<SocketSession | null> {
    const auth = client.handshake.auth as Record<string, unknown>;
    const token = auth.token;

    if (typeof token !== 'string') return null;

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const user = toAccessTokenUser(payload);

      return user ? { user, expiresAtEpochMs: payload.exp * SECOND_MS } : null;
    } catch {
      return null;
    }
  }
}
