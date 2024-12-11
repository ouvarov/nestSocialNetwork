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
  handleJoinChat(
    @MessageBody('chatId') chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(chatId);
    console.log(`Client ${client.id} joined chat room: ${chatId}`);
  }

  @SubscribeMessage('createMessage')
  async create(
    @MessageBody() createMessageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const newMessage = await this.messageService.create(createMessageDto);

    this.server.to(createMessageDto.chatId).emit('newMessage', newMessage);

    return newMessage;
  }
}
