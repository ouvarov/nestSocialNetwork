import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Cursor } from '@/common/pagination/cursor';
import { DRIZZLE, type Database } from '@/database/drizzle';
import { Likes } from '@/database/schemas/likes.schema';
import { Posts } from '@/database/schemas/posts.schema';
import { Uploads } from '@/database/schemas/uploads.schema';
import { Users } from '@/database/schemas/users.schema';

type PostRow = {
  postId: string;
  ownerId: string;
  authorUserName: string;
  authorImageKey: string | null;
  authorLegacyImageUrl: string | null;
  imageKey: string | null;
  legacyImageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  text: string;
  created: Date;
  editedAt: Date | null;
  createdCursor: string;
  likeCount: number;
  likedByMe: boolean;
};

const PostImages = alias(Uploads, 'post_images');
const AuthorAvatars = alias(Uploads, 'author_avatars');

const postColumns = (viewerId: string) => ({
  postId: Posts.post_id,
  ownerId: Posts.owner_id,
  authorUserName: Users.user_name,
  authorImageKey: AuthorAvatars.storage_key,
  authorLegacyImageUrl: Users.image_url,
  imageKey: PostImages.storage_key,
  legacyImageUrl: Posts.image_url,
  imageWidth: PostImages.width,
  imageHeight: PostImages.height,
  text: Posts.text,
  created: Posts.created,
  editedAt: Posts.edited_at,
  createdCursor: sql<string>`${Posts.created}::text`,
  likeCount: sql<number>`(select count(*)::int from ${Likes} post_like where post_like.post_id = ${Posts}.post_id)`,
  likedByMe: sql<boolean>`exists(select 1 from ${Likes} post_like where post_like.post_id = ${Posts}.post_id and post_like.user_id = ${viewerId})`,
});

@Injectable()
export class PostDatabaseOrmService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createPost({
    userId,
    imageUploadId,
    text,
  }: {
    userId: string;
    imageUploadId?: string;
    text: string;
  }): Promise<string> {
    const [post] = await this.db
      .insert(Posts)
      .values({
        owner_id: userId,
        image_upload_id: imageUploadId ?? null,
        text,
      })
      .returning({ postId: Posts.post_id });

    return post.postId;
  }

  async findPost(postId: string, viewerId: string): Promise<PostRow | null> {
    const [post] = await this.selectPosts(viewerId).where(
      eq(Posts.post_id, postId),
    );

    return post ?? null;
  }

  findPostsByIds(postIds: string[], viewerId: string): Promise<PostRow[]> {
    if (postIds.length === 0) return Promise.resolve([]);

    return this.selectPosts(viewerId).where(inArray(Posts.post_id, postIds));
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

    return this.selectPosts(viewerId)
      .where(and(eq(Posts.owner_id, ownerId), isBeforeCursor))
      .orderBy(desc(Posts.created), desc(Posts.post_id))
      .limit(limit + 1);
  }

  async updateText(
    postId: string,
    ownerId: string,
    text: string,
  ): Promise<boolean> {
    const updated = await this.db
      .update(Posts)
      .set({ text, edited_at: sql`now()` })
      .where(and(eq(Posts.post_id, postId), eq(Posts.owner_id, ownerId)))
      .returning({ postId: Posts.post_id });

    return updated.length > 0;
  }

  async like(postId: string, userId: string): Promise<void> {
    await this.db
      .insert(Likes)
      .values({ post_id: postId, user_id: userId })
      .onConflictDoNothing();
  }

  async unlike(postId: string, userId: string): Promise<void> {
    await this.db
      .delete(Likes)
      .where(and(eq(Likes.post_id, postId), eq(Likes.user_id, userId)));
  }

  async deletePost(
    postId: string,
    ownerId: string,
  ): Promise<{ imageUploadId: string | null } | null> {
    const [deleted] = await this.db
      .delete(Posts)
      .where(and(eq(Posts.post_id, postId), eq(Posts.owner_id, ownerId)))
      .returning({ imageUploadId: Posts.image_upload_id });

    return deleted ?? null;
  }

  private selectPosts(viewerId: string) {
    return this.db
      .select(postColumns(viewerId))
      .from(Posts)
      .innerJoin(Users, eq(Users.user_id, Posts.owner_id))
      .leftJoin(PostImages, eq(PostImages.upload_id, Posts.image_upload_id))
      .leftJoin(
        AuthorAvatars,
        eq(AuthorAvatars.upload_id, Users.avatar_upload_id),
      )
      .$dynamic();
  }
}

export type { PostRow };
