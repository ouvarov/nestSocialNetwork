import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

import type { AuthUser } from '@/auth/current-user.decorator';
import { getSocketUser, setSocketUser } from '@/auth/socket-user';
import { ChatService } from '@/chat/chat.service';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

import { ChatRoomDto } from './dto/chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

type AccessTokenPayload = { sub: string; typ: string };

const chatRoom = (chatId: string) => `chat:${chatId}`;

@UseFilters(AllExceptionsFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@WebSocketGateway({ namespace: '/chat' })
export class MessageGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly messageService: MessageService,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const user = await this.authenticate(client);

    if (!user) {
      client.emit('exception', { status: 'error', message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    setSocketUser(client, user);
  }

  @SubscribeMessage('joinChat')
  async joinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() { chatId }: ChatRoomDto,
  ) {
    await this.chatService.assertMember(getSocketUser(client).id, chatId);
    await client.join(chatRoom(chatId));

    return { chatId };
  }

  @SubscribeMessage('leaveChat')
  async leaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() { chatId }: ChatRoomDto,
  ) {
    await client.leave(chatRoom(chatId));

    return { chatId };
  }

  @SubscribeMessage('createMessage')
  async createMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    const { id: senderId } = getSocketUser(client);
    await this.chatService.assertMember(senderId, createMessageDto.chatId);

    const message = await this.messageService.create(
      senderId,
      createMessageDto,
    );
    this.server
      .to(chatRoom(createMessageDto.chatId))
      .emit('newMessage', message);

    return message;
  }

  private async authenticate(client: Socket): Promise<AuthUser | null> {
    const auth = client.handshake.auth as Record<string, unknown>;
    const token = auth.token;

    if (typeof token !== 'string') return null;

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);

      return payload.typ === 'access' ? { id: payload.sub } : null;
    } catch {
      return null;
    }
  }
}
