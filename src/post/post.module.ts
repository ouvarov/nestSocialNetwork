import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/database/database.module';
import { FeedDatabaseService } from '@/database/feed-database.service';
import { PostDatabaseOrmService } from '@/database/post-database.service';
import { StorageModule } from '@/storage/storage.module';

import { FeedService } from './feed.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  controllers: [PostController],
  providers: [
    PostService,
    FeedService,
    PostDatabaseOrmService,
    FeedDatabaseService,
  ],
  imports: [DatabaseModule, StorageModule],
})
export class PostModule {}
