import { Injectable } from '@nestjs/common';

import { decodePageCursor, encodeCursor } from '@/common/pagination/cursor';
import type { PageQueryDto } from '@/common/pagination/page-query.dto';
import {
  FeedDatabaseService,
  type FeedCursor,
  type FeedEntry,
  FOLLOWING_TIER,
} from '@/database/feed-database.service';
import { PostDatabaseOrmService } from '@/database/post-database.service';
import { StorageService } from '@/storage/storage.service';

import type { FeedItemDto, FeedPageDto } from './dto/post-response.dto';
import { toPostResponse } from './post-response';

const FEED_PAGE_SIZE = 20;

const isFeedCursor = (value: unknown): value is FeedCursor =>
  typeof value === 'object' &&
  value !== null &&
  'tier' in value &&
  'createdAt' in value &&
  'id' in value &&
  'since' in value &&
  (value.tier === 0 || value.tier === 1) &&
  typeof value.createdAt === 'string' &&
  typeof value.id === 'string' &&
  typeof value.since === 'string';

const toFeedCursor = (entry: FeedEntry): FeedCursor => ({
  tier: entry.tier,
  createdAt: entry.createdCursor,
  id: entry.postId,
  since: entry.snapshotAt,
});

@Injectable()
export class FeedService {
  constructor(
    private readonly feedDatabaseService: FeedDatabaseService,
    private readonly postDatabaseService: PostDatabaseOrmService,
    private readonly storageService: StorageService,
  ) {}

  async findFeed(
    viewerId: string,
    { limit = FEED_PAGE_SIZE, cursor }: PageQueryDto,
  ): Promise<FeedPageDto> {
    const entries = await this.feedDatabaseService.findFeedPage({
      viewerId,
      limit,
      cursor: cursor ? decodePageCursor(cursor, isFeedCursor) : undefined,
    });
    const hasMore = entries.length > limit;
    const pageEntries = entries.slice(0, limit);
    const lastEntry = pageEntries.at(-1);
    const posts = await this.postDatabaseService.findPostsByIds(
      pageEntries.map(({ postId }) => postId),
      viewerId,
    );
    const postsById = new Map(posts.map((post) => [post.postId, post]));

    return {
      items: pageEntries.flatMap((entry): FeedItemDto[] => {
        const post = postsById.get(entry.postId);
        if (!post) return [];

        return [
          {
            ...toPostResponse(this.storageService, post),
            fromFollowing: entry.tier === FOLLOWING_TIER,
          },
        ];
      }),
      nextCursor:
        hasMore && lastEntry ? encodeCursor(toFeedCursor(lastEntry)) : null,
    };
  }
}
