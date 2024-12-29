import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserDatabaseOrmService } from '@/database/user-database.service';
import { DatabaseProvider } from '@/database/database.provider';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService, UserDatabaseOrmService, DatabaseProvider],
})
export class UserModule {}
