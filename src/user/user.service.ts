import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';

import { UserDatabaseOrmService } from '@/database/user-database.service';

import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly userDatabaseService: UserDatabaseOrmService) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userDatabaseService.findAllPublic();

    return plainToClass(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async findProfile(id: string): Promise<UserResponseDto> {
    const user = await this.userDatabaseService.findPublicById(id);

    if (!user) throw new NotFoundException('User not found');

    return plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findOneById(id: string) {
    return await this.userDatabaseService.findById(id);
  }

  async findOneByEmail(email: string) {
    return await this.userDatabaseService.findByEmail(email);
  }
}
