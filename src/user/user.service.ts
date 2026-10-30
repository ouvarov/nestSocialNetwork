import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { CacheService } from '@/cache/cache.service';
import { decodeCursor, toPage } from '@/common/pagination/cursor';
import type { PageQueryDto } from '@/common/pagination/page-query.dto';
import { FollowDatabaseService } from '@/database/follow-database.service';
import { UploadDatabaseService } from '@/database/upload-database.service';
import {
  type PersonRow,
  type PublicProfile,
  type PublicUser,
  UserDatabaseOrmService,
} from '@/database/user-database.service';
import { UserSocketsService } from '@/realtime/user-sockets.service';
import { toImageUrl } from '@/storage/image-url';
import { StorageService } from '@/storage/storage.service';
import { UploadCleanupService } from '@/storage/upload-cleanup.service';
import { userImagesDir } from '@/storage/user-images';

import type { UpdateProfileDto } from './dto/update-profile.dto';
import type {
  PersonResponseDto,
  ProfileResponseDto,
  UserPageDto,
  UserResponseDto,
} from './dto/user-response.dto';

const PROFILE_TTL_SECONDS = 60;
const USERS_PAGE_SIZE = 20;

const profileKey = (id: string) => `user:profile:v2:${id.toLowerCase()}`;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userDatabaseService: UserDatabaseOrmService,
    private readonly followDatabaseService: FollowDatabaseService,
    private readonly uploadDatabaseService: UploadDatabaseService,
    private readonly cacheService: CacheService,
    private readonly userSocketsService: UserSocketsService,
    private readonly storageService: StorageService,
    private readonly uploadCleanupService: UploadCleanupService,
  ) {}

  async findAll(
    viewerId: string,
    { limit = USERS_PAGE_SIZE, cursor }: PageQueryDto,
  ): Promise<UserPageDto> {
    const rows = await this.userDatabaseService.findPeoplePage({
      viewerId,
      limit,
      cursor: cursor ? decodeCursor(cursor) : undefined,
    });

    return toPage(
      rows,
      limit,
      (row) => this.toPersonResponse(row),
      (row) => ({ createdAt: row.createdCursor, id: row.id }),
    );
  }

  async findProfile(id: string, viewerId: string): Promise<ProfileResponseDto> {
    const profile = await this.findPublicProfile(id);

    if (!profile) throw new NotFoundException('User not found');

    const isFollowedByMe =
      viewerId !== id &&
      (await this.followDatabaseService.isFollowing(viewerId, id));

    return {
      ...this.toUserResponse(profile),
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      isFollowedByMe,
    };
  }

  async findUser(id: string): Promise<UserResponseDto | null> {
    const profile = await this.findPublicProfile(id);

    return profile ? this.toUserResponse(profile) : null;
  }

  async updateProfile(
    userId: string,
    patch: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const isEmptyPatch = Object.values(patch).every(
      (value) => value === undefined,
    );

    if (!isEmptyPatch) await this.writeProfile(userId, patch);

    const user = await this.findUser(userId);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  private async writeProfile(
    userId: string,
    { userName, description, avatarUploadId }: UpdateProfileDto,
  ): Promise<void> {
    await this.assertOwnUpload(userId, avatarUploadId);

    const update = await this.userDatabaseService.updateProfile(userId, {
      userName,
      description,
      avatarUploadId,
    });
    if (!update) throw new NotFoundException('User not found');

    await this.invalidateProfiles([userId]);

    const isAvatarReplaced =
      avatarUploadId !== undefined &&
      update.previousAvatarUploadId !== avatarUploadId;
    if (isAvatarReplaced) {
      await this.uploadCleanupService.removeIfUnused(
        update.previousAvatarUploadId,
      );
    }
  }

  async invalidateProfiles(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) => this.cacheService.delete(profileKey(id))),
    );
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

  private async findPublicProfile(id: string): Promise<PublicProfile | null> {
    const cached = await this.cacheService.get<PublicProfile>(profileKey(id));

    if (cached) return cached;

    const profile = await this.userDatabaseService.findPublicProfile(id);

    if (profile) {
      await this.cacheService.set(profileKey(id), profile, PROFILE_TTL_SECONDS);
    }

    return profile;
  }

  private async assertOwnUpload(
    userId: string,
    uploadId: string | null | undefined,
  ): Promise<void> {
    if (!uploadId) return;

    const isOwnUpload = await this.uploadDatabaseService.isOwnedBy(
      uploadId,
      userId,
    );
    if (!isOwnUpload) {
      throw new BadRequestException(
        'avatarUploadId must be an image you uploaded',
      );
    }
  }

  private toUserResponse(user: PublicUser): UserResponseDto {
    return {
      id: user.id,
      userName: user.userName,
      imageUrl: toImageUrl(this.storageService, user),
      description: user.description,
      created: user.created,
    };
  }

  private toPersonResponse(row: PersonRow): PersonResponseDto {
    return {
      ...this.toUserResponse(row),
      followersCount: row.followersCount,
      isFollowedByMe: row.isFollowedByMe,
    };
  }

  private logCleanupFailure(what: string, userId: string, error: unknown) {
    this.logger.warn(
      `The ${what} of deleted user ${userId} was not removed: ${String(error)}`,
    );
  }
}
