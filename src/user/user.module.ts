import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserDatabaseOrmService } from '@/database/user-database.service';
import { CacheDataModule } from '@/cache/cache.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule, CacheDataModule],
  controllers: [UserController],
  providers: [UserService, UserDatabaseOrmService],
  exports: [UserService],
})
export class UserModule {}
