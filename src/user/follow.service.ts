import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { FollowDatabaseService } from '@/database/follow-database.service';

import type { FollowStateDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@Injectable()
export class FollowService {
  constructor(
    private readonly followDatabaseService: FollowDatabaseService,
    private readonly userService: UserService,
  ) {}

  async follow(
    followerId: string,
    followeeId: string,
  ): Promise<FollowStateDto> {
    this.assertNotSelf(followerId, followeeId);

    await this.followDatabaseService.follow(followerId, followeeId);
    await this.userService.invalidateProfiles([followerId, followeeId]);

    return this.findState(followerId, followeeId);
  }

  async unfollow(
    followerId: string,
    followeeId: string,
  ): Promise<FollowStateDto> {
    this.assertNotSelf(followerId, followeeId);

    if (!(await this.userService.exists(followeeId))) {
      throw new NotFoundException('User not found');
    }

    await this.followDatabaseService.unfollow(followerId, followeeId);
    await this.userService.invalidateProfiles([followerId, followeeId]);

    return this.findState(followerId, followeeId);
  }

  private assertNotSelf(followerId: string, followeeId: string): void {
    if (followerId === followeeId) {
      throw new BadRequestException('You cannot follow yourself');
    }
  }

  private async findState(
    followerId: string,
    followeeId: string,
  ): Promise<FollowStateDto> {
    const state = await this.followDatabaseService.findState(
      followerId,
      followeeId,
    );

    return { userId: followeeId, ...state };
  }
}
