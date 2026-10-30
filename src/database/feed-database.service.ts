import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@/database/drizzle';
import { Follows } from '@/database/schemas/follows.schema';
import { Posts } from '@/database/schemas/posts.schema';

type FeedTier = 0 | 1;

type FeedCursor = {
  tier: FeedTier;
  createdAt: string;
  id: string;
  since: string;
};

type FeedEntry = {
  tier: FeedTier;
  postId: string;
  createdCursor: string;
  snapshotAt: string;
};

const FOLLOWING_TIER: FeedTier = 0;
const EVERYONE_TIER: FeedTier = 1;

@Injectable()
export class FeedDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findFeedPage({
    viewerId,
    limit,
    cursor,
  }: {
    viewerId: string;
    limit: number;
    cursor?: FeedCursor;
  }): Promise<FeedEntry[]> {
    const pageSize = limit + 1;
    const startTier = cursor?.tier ?? FOLLOWING_TIER;
    const afterInFollowing =
      cursor?.tier === FOLLOWING_TIER
        ? sql`and (${Posts}.created, ${Posts}.post_id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
        : sql``;
    const afterInEveryone =
      cursor?.tier === EVERYONE_TIER
        ? sql`and (everyone.created, everyone.post_id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
        : sql``;

    const entries = await this.db.execute<FeedEntry>(sql`
      with params as (
        select coalesce(${cursor?.since ?? null}::timestamptz, statement_timestamp()) as since
      ),
      authors as (
        select followed.followee_id as owner_id
        from ${Follows} followed, params
        where followed.follower_id = ${viewerId} and followed.created <= params.since
        union all
        select ${viewerId}::uuid
      ),
      candidates as (
        (
          select ${FOLLOWING_TIER}::int as tier, latest.post_id, latest.created
          from authors
          cross join params
          cross join lateral (
            select ${Posts}.post_id, ${Posts}.created
            from ${Posts}
            where ${Posts}.owner_id = authors.owner_id
              and ${Posts}.created <= params.since
              ${afterInFollowing}
            order by ${Posts}.created desc, ${Posts}.post_id desc
            limit ${pageSize}
          ) latest
          where ${startTier}::int = ${FOLLOWING_TIER}
          order by latest.created desc, latest.post_id desc
          limit ${pageSize}
        )
        union all
        (
          select ${EVERYONE_TIER}::int as tier, everyone.post_id, everyone.created
          from ${Posts} everyone, params
          where everyone.owner_id <> ${viewerId}
            and everyone.created <= params.since
            and not exists (
              select 1 from ${Follows} followed
              where followed.follower_id = ${viewerId}
                and followed.followee_id = everyone.owner_id
                and followed.created <= params.since
            )
            ${afterInEveryone}
          order by everyone.created desc, everyone.post_id desc
          limit ${pageSize}
        )
      )
      select
        candidates.tier,
        candidates.post_id as "postId",
        candidates.created::text as "createdCursor",
        (select since::text from params) as "snapshotAt"
      from candidates
      order by candidates.tier, candidates.created desc, candidates.post_id desc
      limit ${pageSize}
    `);

    return [...entries];
  }
}

export { EVERYONE_TIER, FOLLOWING_TIER };
export type { FeedCursor, FeedEntry, FeedTier };
