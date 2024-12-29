import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';

import { MessageDatabaseService } from '@/database/message-database.service';

@Injectable()
export class MessageService {
  constructor(private readonly messageDatabaseModule: MessageDatabaseService) {}
  async create(createMessageDto: CreateMessageDto) {
    return await this.messageDatabaseModule.createMessage(createMessageDto);
  }
}
