import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Public } from '@/auth/public.decorator';

@Public()
@WebSocketGateway(5001, {
  cors: {
    origin: ['http://localhost:3001', '*'],
  },
})
export class MessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(chatId);
  }

  @SubscribeMessage('createMessage')
  async create(@MessageBody() createMessageDto: CreateMessageDto) {
    const newMessage = await this.messageService.create(createMessageDto);

    this.server.to(createMessageDto.chatId).emit('newMessage', newMessage);

    return newMessage;
  }
}
