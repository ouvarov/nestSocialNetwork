import { Injectable } from '@nestjs/common';
import { User } from './user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private UserModel: Model<User>) {}
  async findAll() {
    const users = await this.UserModel.find().exec();

    return users;
  }

  async findOneById(id: string) {
    const user = await this.UserModel.findOne({ _id: id }).exec();

    return user;
  }

  async findOneByEmail(email: string) {
    const user = await this.UserModel.findOne({ email: email }).exec();

    return user;
  }
}
