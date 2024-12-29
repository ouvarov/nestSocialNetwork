import { Injectable } from '@nestjs/common';
import { UserDatabaseOrmService } from '@/database/user-database.service';

import { plainToClass } from 'class-transformer';

import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly userDatabaseService: UserDatabaseOrmService) {}
  async findAll() {
    const users = await this.userDatabaseService.findAll();

    const responseUserData = plainToClass(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });

    return responseUserData;
  }

  async findOneById(id: string) {
    return await this.userDatabaseService.findById(id);
  }

  async findOneByEmail(email: string) {
    return await this.userDatabaseService.findByEmail(email);
  }
}
