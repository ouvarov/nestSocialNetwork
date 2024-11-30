import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatDatabaseService } from '../database/chat-database.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  providers: [ChatGateway, ChatService, ChatDatabaseService],
  imports: [DatabaseModule],
})
export class ChatModule {}
