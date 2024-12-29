import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { UserModule } from '@/user/user.module';
import { AuthModule } from '@/auth/auth.module';
import { AuthService } from '@/auth/auth.service';
import { UserService } from '@/user/user.service';
import { CacheService } from '@/cache/cache.service';
import { CacheDataModule } from '@/cache/cashe.module';
import { DatabaseProvider } from '@/database/database.provider';
import { UserDatabaseOrmService } from '@/database/user-database.service';

import { PostService } from './post.service';
import { PostController } from './post.controller';
import { DatabaseModule } from '@/database/database.module';
import { AuthDatabaseService } from '@/database/auth-database.service';
import { PostDatabaseOrmService } from '@/database/post-database.service';

@Module({
  controllers: [PostController],
  providers: [
    PostService,
    AuthService,
    UserService,
    DatabaseProvider,
    CacheService,
    UserDatabaseOrmService,
    AuthDatabaseService,
    PostDatabaseOrmService,
  ],
  imports: [
    DatabaseModule,
    UserModule,
    AuthModule,
    CacheDataModule,
    CacheModule.register({ ttl: 6 }),
  ],
  exports: [PostModule],
})
export class PostModule {}
