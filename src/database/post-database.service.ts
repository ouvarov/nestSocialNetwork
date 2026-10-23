import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

import type { Cursor } from '@/common/pagination/cursor';
import { Likes } from '@/database/schemas/likes.schema';
import { Posts } from '@/database/schemas/posts.schema';

type PostRow = {
  postId: string;
  ownerId: string;
  imageUrl: string | null;
  text: string;
  created: Date;
  createdCursor: string;
  likeCount: number;
  likedByMe: boolean;
};

const postColumns = (viewerId: string) => ({
  postId: Posts.post_id,
  ownerId: Posts.owner_id,
  imageUrl: Posts.image_url,
  text: Posts.text,
  created: Posts.created,
  createdCursor: sql<string>`${Posts.created}::text`,
  likeCount: sql<number>`(select count(*)::int from ${Likes} post_like where post_like.post_id = ${Posts}.post_id)`,
  likedByMe: sql<boolean>`exists(select 1 from ${Likes} post_like where post_like.post_id = ${Posts}.post_id and post_like.user_id = ${viewerId})`,
});

@Injectable()
export class PostDatabaseOrmService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async createPost({
    userId,
    imageUrl,
    text,
  }: {
    userId: string;
    imageUrl?: string;
    text: string;
  }): Promise<string> {
    const [post] = await this.Drizzle.insert(Posts)
      .values({ owner_id: userId, image_url: imageUrl ?? null, text })
      .returning({ postId: Posts.post_id });

    return post.postId;
  }

  async findPost(postId: string, viewerId: string): Promise<PostRow | null> {
    const [post] = await this.Drizzle.select(postColumns(viewerId))
      .from(Posts)
      .where(eq(Posts.post_id, postId));

    return post ?? null;
  }

  findPostsOfOwner({
    ownerId,
    viewerId,
    limit,
    cursor,
  }: {
    ownerId: string;
    viewerId: string;
    limit: number;
    cursor?: Cursor;
  }): Promise<PostRow[]> {
    const isBeforeCursor = cursor
      ? sql`(${Posts.created}, ${Posts.post_id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : undefined;

    return this.Drizzle.select(postColumns(viewerId))
      .from(Posts)
      .where(and(eq(Posts.owner_id, ownerId), isBeforeCursor))
      .orderBy(desc(Posts.created), desc(Posts.post_id))
      .limit(limit + 1);
  }

  async like(postId: string, userId: string): Promise<void> {
    await this.Drizzle.insert(Likes)
      .values({ post_id: postId, user_id: userId })
      .onConflictDoNothing();
  }

  async unlike(postId: string, userId: string): Promise<void> {
    await this.Drizzle.delete(Likes).where(
      and(eq(Likes.post_id, postId), eq(Likes.user_id, userId)),
    );
  }

  async deletePost(postId: string, ownerId: string): Promise<boolean> {
    const deleted = await this.Drizzle.delete(Posts)
      .where(and(eq(Posts.post_id, postId), eq(Posts.owner_id, ownerId)))
      .returning({ postId: Posts.post_id });

    return deleted.length > 0;
  }
}

export type { PostRow };
