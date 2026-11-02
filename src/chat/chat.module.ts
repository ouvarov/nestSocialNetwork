import { Module } from '@nestjs/common';

import { ChatDatabaseService } from '@/database/chat-database.service';
import { DatabaseModule } from '@/database/database.module';
import { GroupChatDatabaseService } from '@/database/group-chat-database.service';
import { RealtimeModule } from '@/realtime/realtime.module';
import { StorageModule } from '@/storage/storage.module';
import { UserModule } from '@/user/user.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GroupChatController } from './group-chat.controller';
import { GroupChatService } from './group-chat.service';

@Module({
  controllers: [ChatController, GroupChatController],
  imports: [DatabaseModule, RealtimeModule, StorageModule, UserModule],
  providers: [
    ChatService,
    ChatDatabaseService,
    GroupChatService,
    GroupChatDatabaseService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
