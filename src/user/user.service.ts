import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { plainToClass } from 'class-transformer';

import { CacheService } from '@/cache/cache.service';
import { decodeCursor, toPage } from '@/common/pagination/cursor';
import type { PageQueryDto } from '@/common/pagination/page-query.dto';
import {
  type PublicUser,
  UserDatabaseOrmService,
} from '@/database/user-database.service';
import { UserSocketsService } from '@/realtime/user-sockets.service';
import { StorageService } from '@/storage/storage.service';
import { userImagesDir } from '@/storage/user-images';

import { type UserPageDto, UserResponseDto } from './dto/user-response.dto';

const PROFILE_TTL_SECONDS = 60;
const USERS_PAGE_SIZE = 20;

const profileKey = (id: string) => `user:profile:${id}`;

const toUserResponse = (user: PublicUser): UserResponseDto =>
  plainToClass(UserResponseDto, user, { excludeExtraneousValues: true });

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userDatabaseService: UserDatabaseOrmService,
    private readonly cacheService: CacheService,
    private readonly userSocketsService: UserSocketsService,
    private readonly storageService: StorageService,
  ) {}

  async findAll({
    limit = USERS_PAGE_SIZE,
    cursor,
  }: PageQueryDto): Promise<UserPageDto> {
    const rows = await this.userDatabaseService.findPublicPage({
      limit,
      cursor: cursor ? decodeCursor(cursor) : undefined,
    });

    return toPage(rows, limit, toUserResponse, (row) => ({
      createdAt: row.createdCursor,
      id: row.user_id,
    }));
  }

  async findProfile(id: string): Promise<UserResponseDto> {
    const user = await this.findPublicProfile(id);

    if (!user) throw new NotFoundException('User not found');

    return toUserResponse(user);
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

  exists(id: string): Promise<boolean> {
    return this.userDatabaseService.exists(id);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.userDatabaseService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new ForbiddenException('Wrong password');

    const isDeleted = await this.userDatabaseService.deleteUser(userId);
    if (!isDeleted) throw new UnauthorizedException();

    this.userSocketsService.disconnectUser(userId);
    await Promise.all([
      this.cacheService.delete(profileKey(userId)),
      this.storageService
        .removeDirectory(userImagesDir(userId))
        .catch((error: unknown) =>
          this.logCleanupFailure('images', userId, error),
        ),
    ]);
  }

  private logCleanupFailure(what: string, userId: string, error: unknown) {
    this.logger.warn(
      `The ${what} of deleted user ${userId} was not removed: ${String(error)}`,
    );
  }
}
