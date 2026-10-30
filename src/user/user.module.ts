import { Module } from '@nestjs/common';

import { CacheDataModule } from '@/cache/cache.module';
import { DatabaseModule } from '@/database/database.module';
import { FollowDatabaseService } from '@/database/follow-database.service';
import { UserDatabaseOrmService } from '@/database/user-database.service';
import { RealtimeModule } from '@/realtime/realtime.module';
import { StorageModule } from '@/storage/storage.module';

import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule, CacheDataModule, RealtimeModule, StorageModule],
  controllers: [UserController, FollowController],
  providers: [
    UserService,
    FollowService,
    UserDatabaseOrmService,
    FollowDatabaseService,
  ],
  exports: [UserService],
})
export class UserModule {}
