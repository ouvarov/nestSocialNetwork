import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { AuthService } from '../auth/auth.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { UserService } from '../user/user.service';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.provider';
import { PostDatabaseService } from '../database/post-database.module';

@Module({
  controllers: [PostController],
  providers: [
    PostService,
    AuthService,
    UserService,
    DatabaseService,
    PostDatabaseService,
  ],
  imports: [UserModule, AuthModule, DatabaseModule],
  exports: [PostModule],
})
export class PostModule {}
