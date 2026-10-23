import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';

import { CacheService } from '@/cache/cache.service';
import {
  type PublicUser,
  UserDatabaseOrmService,
} from '@/database/user-database.service';

import { UserResponseDto } from './dto/user-response.dto';

const PROFILE_TTL_SECONDS = 60;

const profileKey = (id: string) => `user:profile:${id}`;

@Injectable()
export class UserService {
  constructor(
    private readonly userDatabaseService: UserDatabaseOrmService,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userDatabaseService.findAllPublic();

    return plainToClass(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async findProfile(id: string): Promise<UserResponseDto> {
    const user = await this.findPublicProfile(id);

    if (!user) throw new NotFoundException('User not found');

    return plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  private async findPublicProfile(id: string): Promise<PublicUser | null> {
    const cached = await this.cacheService.get<PublicUser>(profileKey(id));

    if (cached) return cached;

    const user = await this.userDatabaseService.findPublicById(id);

    if (user) {
      await this.cacheService.set(profileKey(id), user, PROFILE_TTL_SECONDS);
    }

    return user;
  }

  async findOneById(id: string) {
    return await this.userDatabaseService.findById(id);
  }

  async findOneByEmail(email: string) {
    return await this.userDatabaseService.findByEmail(email);
  }
}
