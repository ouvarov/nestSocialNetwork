import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { ChatModule } from '@/chat/chat.module';
import { DatabaseModule } from '@/database/database.module';
import { MessageDatabaseService } from '@/database/message-database.service';

import { MessageGateway } from './message.gateway';
import { MessageService } from './message.service';

@Module({
  providers: [MessageGateway, MessageService, MessageDatabaseService],
  imports: [DatabaseModule, AuthModule, ChatModule],
})
export class MessageModule {}
