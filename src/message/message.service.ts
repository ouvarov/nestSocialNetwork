import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

import { MessageDatabaseService } from '../database/message-database.service';

@Injectable()
export class MessageService {
  constructor(private readonly messageDatabaseModule: MessageDatabaseService) {}
  async create(createMessageDto: CreateMessageDto) {
    return await this.messageDatabaseModule.createMessage(createMessageDto);
  }

  update(id: number, updateMessageDto: UpdateMessageDto) {
    return `This action updates a #${id} message`;
  }

  remove(id: number) {
    return `This action removes a #${id} message`;
  }
}
