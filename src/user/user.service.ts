import { Injectable } from '@nestjs/common';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UserDatabaseService } from '../database/user-database.module';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    private readonly userDatabaseService: UserDatabaseService,
  ) {}
  async findAll() {
    const users = await this.UserModel.find().exec();

    return users;
  }

  async findOneById(id: string) {
    return await this.userDatabaseService.findById(id);
  }

  async findOneByEmail(email: string) {
    return await this.userDatabaseService.findByEmail(email);
  }
}
