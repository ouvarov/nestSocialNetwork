import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/database/database.module';
import { PostDatabaseOrmService } from '@/database/post-database.service';

import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  controllers: [PostController],
  providers: [PostService, PostDatabaseOrmService],
  imports: [DatabaseModule],
})
export class PostModule {}
