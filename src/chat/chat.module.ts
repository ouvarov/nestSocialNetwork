import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatDatabaseService } from '../database/chat-database.service';
import { DatabaseService } from '../database/database.provider';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatDatabaseService, DatabaseService],
})
export class ChatModule {}
