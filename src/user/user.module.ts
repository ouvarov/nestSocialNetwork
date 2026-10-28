import { Module } from '@nestjs/common';

import { CacheDataModule } from '@/cache/cache.module';
import { DatabaseModule } from '@/database/database.module';
import { UserDatabaseOrmService } from '@/database/user-database.service';
import { RealtimeModule } from '@/realtime/realtime.module';
import { StorageModule } from '@/storage/storage.module';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule, CacheDataModule, RealtimeModule, StorageModule],
  controllers: [UserController],
  providers: [UserService, UserDatabaseOrmService],
  exports: [UserService],
})
export class UserModule {}
