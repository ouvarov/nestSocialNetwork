import { Module } from '@nestjs/common';

import { ChatDatabaseService } from '@/database/chat-database.service';
import { DatabaseModule } from '@/database/database.module';
import { StorageModule } from '@/storage/storage.module';
import { UserModule } from '@/user/user.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  imports: [DatabaseModule, StorageModule, UserModule],
  providers: [ChatService, ChatDatabaseService],
  exports: [ChatService],
})
export class ChatModule {}
