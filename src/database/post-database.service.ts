import { drizzle } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { Posts } from '@/database/schemas/posts.schema';
import { and, eq, sql } from 'drizzle-orm';
import { Likes } from '@/database/schemas/likes.schema';

@Injectable()
export class PostDatabaseOrmService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async createPost({
    userId,
    imageUrl = '',
    text,
  }: {
    userId: string;
    imageUrl?: string;
    text: string;
  }) {
    const posts = await this.Drizzle.insert(Posts)
      .values({
        owner_id: userId,
        image_url: imageUrl,
        text: text,
      })
      .returning()
      .execute();

    return posts[0];
  }

  async toggleLikeOnPost({
    postId,
    userId,
  }: {
    postId: string;
    userId: string;
  }) {
    const existingLike = await this.Drizzle.select()
      .from(Likes)
      .where(and(eq(Likes.post_id, postId), eq(Likes.user_id, userId)))
      .execute();

    if (existingLike.length > 0) {
      await this.Drizzle.delete(Likes)
        .where(and(eq(Likes.post_id, postId), eq(Likes.user_id, userId)))
        .execute();
    } else {
      console.log(existingLike, 'existingLike');
      await this.Drizzle.insert(Likes)
        .values({
          post_id: postId,
          user_id: userId,
        })
        .execute();
    }

    const resault = await this.Drizzle.select({
      post_id: Posts.post_id,
      owner_id: Posts.owner_id,
      image_url: Posts.image_url,
      text: Posts.text,
      created: Posts.created,
      likes:
        sql`COALESCE(array_agg(${Likes.user_id}) FILTER (WHERE ${Likes.user_id} IS NOT NULL), ARRAY[]::uuid[])`.as(
          'likes',
        ),
    })
      .from(Posts)
      .leftJoin(Likes, eq(Posts.post_id, Likes.post_id))
      .where(eq(Posts.post_id, postId))
      .groupBy(Posts.post_id)
      .execute();

    return resault[0];
  }

  async deletePost({ postId, userId }: { postId: string; userId: string }) {
    const result = await this.Drizzle.delete(Posts)
      .where(and(eq(Posts.post_id, postId), eq(Posts.owner_id, userId)))
      .returning()
      .execute();

    // If no post is deleted, throw an error
    if (result.length === 0) {
      throw new Error('Post not found or you are not the owner');
    }

    // Return the deleted post
    return result[0];
  }

  async allPosts(id: string) {
    const result = await this.Drizzle.select({
      post_id: Posts.post_id,
      owner_id: Posts.owner_id,
      image_url: Posts.image_url,
      text: Posts.text,
      created: Posts.created,
      likes:
        sql`COALESCE(array_agg(${Likes.user_id}) FILTER (WHERE ${Likes.user_id} IS NOT NULL), ARRAY[]::uuid[])`.as(
          'likes',
        ),
    })
      .from(Posts)
      .leftJoin(Likes, eq(Posts.post_id, Likes.post_id))
      .groupBy(
        Posts.post_id,
        Posts.owner_id,
        Posts.image_url,
        Posts.text,
        Posts.created,
      )
      .execute();
    return result;
  }
}
