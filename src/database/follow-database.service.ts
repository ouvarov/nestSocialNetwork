import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@/database/drizzle';
import { Follows } from '@/database/schemas/follows.schema';

type FollowState = {
  isFollowedByMe: boolean;
  followersCount: number;
  followingCount: number;
};

@Injectable()
export class FollowDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async follow(followerId: string, followeeId: string): Promise<void> {
    await this.db
      .insert(Follows)
      .values({ follower_id: followerId, followee_id: followeeId })
      .onConflictDoNothing();
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.db
      .delete(Follows)
      .where(
        and(
          eq(Follows.follower_id, followerId),
          eq(Follows.followee_id, followeeId),
        ),
      );
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const [follow] = await this.db
      .select({ followeeId: Follows.followee_id })
      .from(Follows)
      .where(
        and(
          eq(Follows.follower_id, followerId),
          eq(Follows.followee_id, followeeId),
        ),
      );

    return follow !== undefined;
  }

  async findState(viewerId: string, userId: string): Promise<FollowState> {
    const [state] = await this.db.execute<FollowState>(sql`
      select
        exists(select 1 from ${Follows} where follower_id = ${viewerId} and followee_id = ${userId}) as "isFollowedByMe",
        (select count(*)::int from ${Follows} where followee_id = ${userId}) as "followersCount",
        (select count(*)::int from ${Follows} where follower_id = ${userId}) as "followingCount"
    `);

    return state;
  }
}

export type { FollowState };
