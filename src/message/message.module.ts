import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { MessageDatabaseService } from '@/database/message-database.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  providers: [MessageGateway, MessageService, MessageDatabaseService],
  imports: [DatabaseModule],
})
export class MessageModule {}
