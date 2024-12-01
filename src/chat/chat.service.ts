import { Injectable } from '@nestjs/common';
import { ChatDatabaseService } from '../database/chat-database.service';

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
}
