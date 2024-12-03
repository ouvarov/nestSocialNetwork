import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { AuthService } from '../auth/auth.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { UserService } from '../user/user.service';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.provider';
import { PostDatabaseService } from '../database/post-database.service';
import { CacheService } from '../cache/cache.service';
import { CacheDataModule } from '../cache/cashe.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  controllers: [PostController],
  providers: [
    PostService,
    AuthService,
    UserService,
    DatabaseService,
    PostDatabaseService,
    CacheService,
  ],
  imports: [
    UserModule,
    AuthModule,
    DatabaseModule,
    CacheDataModule,
    CacheModule.register({ ttl: 6 }),
  ],
  exports: [PostModule],
})
export class PostModule {}
