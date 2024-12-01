import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { MessageDatabaseService } from '../database/message-database.service';
import { DatabaseService } from '../database/database.provider';

@Module({
  providers: [
    MessageGateway,
    MessageService,
    MessageDatabaseService,
    DatabaseService,
  ],
})
export class MessageModule {}
