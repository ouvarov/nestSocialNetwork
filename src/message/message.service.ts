import { Injectable } from '@nestjs/common';

import { MessageDatabaseService } from '@/database/message-database.service';

import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly messageDatabaseService: MessageDatabaseService,
  ) {}

  create(senderId: string, { chatId, content }: CreateMessageDto) {
    return this.messageDatabaseService.createMessage({
      chatId,
      senderId,
      content,
    });
  }
}
