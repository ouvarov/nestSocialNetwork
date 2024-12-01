import { Module } from '@nestjs/common';
import { DatabaseService } from './database.provider';
import { PostDatabaseService } from './post-database.service';
import { AuthDatabaseService } from './auth-database.service';
import { UserDatabaseService } from './user-database.service';
import { ChatDatabaseService } from './chat-database.service';
import { MessageDatabaseService } from './message-database.service';

@Module({
  providers: [
    DatabaseService,
    PostDatabaseService,
    AuthDatabaseService,
    UserDatabaseService,
    ChatDatabaseService,
    MessageDatabaseService,
  ],
  exports: [
    DatabaseService,
    PostDatabaseService,
    AuthDatabaseService,
    UserDatabaseService,
    ChatDatabaseService,
    MessageDatabaseService,
  ],
})
export class DatabaseModule {}
