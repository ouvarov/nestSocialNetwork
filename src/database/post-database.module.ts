import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.provider';

@Injectable()
export class PostDatabaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createPost({
    userId,
    imageUrl,
    text,
  }: {
    userId: string;
    imageUrl: string;
    text: string;
  }) {
    const query = `
        INSERT INTO posts (owner_id, image_url, text, likes)
        VALUES ($1, $2, $3, $4)
        RETURNING id, owner_id, image_url, text, likes, created;
    `;

    const values = [userId, imageUrl, text, []];

    const result = await this.databaseService.query(query, values);

    const post = result.rows[0];
  }

  async toggleLikeOnPost({
    postId,
    userId,
  }: {
    postId: string;
    userId: string;
  }) {
    const query = `
        UPDATE posts
        SET likes = CASE
            WHEN $1 = ANY(likes) THEN array_remove(likes, $1) 
            ELSE array_append(likes, $1) 
            END
        WHERE id = $2
            RETURNING id, likes;
    `;

    const values = [userId, postId];

    const result = await this.databaseService.query(query, values);

    return result.rows[0];
  }

  async deletePost({ postId, userId }: { postId: string; userId: string }) {
    const query = `
        DELETE FROM posts
        WHERE id = $1 AND owner_id = $2 
            RETURNING id;  
    `;

    const values = [postId, userId];

    const result = await this.databaseService.query(query, values);

    if (result.rowCount === 0) {
      throw new Error('Post not found or you are not the owner'); // Если пост не найден или пользователь не является владельцем
    }

    return result.rows[0]; // Возвращаем id удалённого поста
  }

  async allPosts(id: string) {
    const query = `
      SELECT * FROM posts
      WHERE owner_id = $1;
    `;

    const result = await this.databaseService.query(query, [id]);

    const findAllPosts = result.rows;

    return findAllPosts;
  }
}
