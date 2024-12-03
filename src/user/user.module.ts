import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';
import { UserDatabaseService } from '../database/user-database.service';

@Module({
  controllers: [UserController],
  providers: [UserService, UserDatabaseService],
  imports: [DatabaseModule],
})
export class UserModule {}
