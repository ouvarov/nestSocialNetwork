import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatDatabaseService } from '@/database/chat-database.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  controllers: [ChatController],
  imports: [DatabaseModule],
  providers: [ChatService, ChatDatabaseService],
})
export class ChatModule {}
