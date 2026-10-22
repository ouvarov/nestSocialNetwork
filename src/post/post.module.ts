import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { CacheService } from '@/cache/cache.service';
import { CacheDataModule } from '@/cache/cache.module';

import { PostService } from './post.service';
import { PostController } from './post.controller';
import { DatabaseModule } from '@/database/database.module';
import { PostDatabaseOrmService } from '@/database/post-database.service';

@Module({
  controllers: [PostController],
  providers: [PostService, CacheService, PostDatabaseOrmService],
  imports: [DatabaseModule, CacheDataModule, CacheModule.register({ ttl: 6 })],
  exports: [PostModule],
})
export class PostModule {}
