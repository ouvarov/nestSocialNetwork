import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatDatabaseService } from '../database/chat-database.service';

@Injectable()
export class ChatService {
  constructor(private readonly chatDatabaseModule: ChatDatabaseService) {}
  async create(userIds: string[]) {
    const newChat = await this.chatDatabaseModule.createChat({ userIds });
    return newChat;
  }

  findAll() {
    return `This action returns all chat`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chat`;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
    return `This action removes a #${id} chat`;
  }
}
