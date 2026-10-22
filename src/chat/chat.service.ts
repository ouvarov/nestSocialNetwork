import { Injectable } from '@nestjs/common';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatDatabaseService } from '@/database/chat-database.service';

@Injectable()
export class ChatService {
  constructor(private readonly chatDatabaseModule: ChatDatabaseService) {}

  create(userIds: string[]) {
    return this.chatDatabaseModule.createChat({ userIds });
  }

  findAll() {
    return this.chatDatabaseModule.getAllChats();
  }

  findOne(id: string) {
    return this.chatDatabaseModule.getChatWithMessages(id);
  }

  deleteChat(id: string) {
    return this.chatDatabaseModule.deleteChat(id);
  }

  updateChatName(updateChatDto: UpdateChatDto) {
    return this.chatDatabaseModule.updateChatName(updateChatDto);
  }
}
