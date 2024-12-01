import { Injectable } from '@nestjs/common';
import { ChatDatabaseService } from '../database/chat-database.service';
import { UpdateMessageDto } from '../message/dto/update-message.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly chatDatabaseModule: ChatDatabaseService) {}
  async create(userIds: string[]) {
    return await this.chatDatabaseModule.createChat({ userIds });
  }

  async findAll() {
    return await this.chatDatabaseModule.getAllChats();
  }

  async findOne(id: string) {
    return await this.chatDatabaseModule.getChatWithMessages(id);
  }

  async deleteChat(id: string) {
    return await this.chatDatabaseModule.deleteChat(id);
  }

  async updateChatName(updateChatDto: UpdateChatDto) {
    return await this.chatDatabaseModule.updateChatName(updateChatDto);
  }
}
