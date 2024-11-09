import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../database/database.module';
import { UserDatabaseService } from '../database/user-database.module';

@Module({
  controllers: [UserController],
  providers: [UserService, UserDatabaseService],
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    DatabaseModule,
  ],
  exports: [MongooseModule],
})
export class UserModule {}
