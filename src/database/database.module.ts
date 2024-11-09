import { Module } from '@nestjs/common';
import { DatabaseService } from './database.provider';
import { PostDatabaseService } from './post-database.module';
import { AuthDatabaseService } from './auth-database.module';
import { UserDatabaseService } from './user-database.module';

@Module({
  providers: [
    DatabaseService,
    PostDatabaseService,
    AuthDatabaseService,
    UserDatabaseService,
  ],
  exports: [
    DatabaseService,
    PostDatabaseService,
    AuthDatabaseService,
    UserDatabaseService,
  ],
})
export class DatabaseModule {}
