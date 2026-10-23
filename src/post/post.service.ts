import { Injectable, NotFoundException } from '@nestjs/common';

import { decodeCursor, toPage } from '@/common/pagination/cursor';
import type { PageQueryDto } from '@/common/pagination/page-query.dto';
import {
  PostDatabaseOrmService,
  type PostRow,
} from '@/database/post-database.service';

import type { CreatePostDto } from './dto/create-post.dto';
import type { PostPageDto, PostResponseDto } from './dto/post-response.dto';

const toPostResponse = ({
  postId,
  ownerId,
  imageUrl,
  text,
  created,
  likeCount,
  likedByMe,
}: PostRow): PostResponseDto => ({
  id: postId,
  ownerId,
  imageUrl,
  text,
  created,
  likeCount,
  likedByMe,
});

@Injectable()
export class PostService {
  constructor(private readonly postDatabaseService: PostDatabaseOrmService) {}

  async create(
    userId: string,
    { text, imageUrl }: CreatePostDto,
  ): Promise<PostResponseDto> {
    const postId = await this.postDatabaseService.createPost({
      userId,
      imageUrl,
      text,
    });

    return this.getPost(postId, userId);
  }

  async findPostsOfOwner(
    ownerId: string,
    viewerId: string,
    { limit, cursor }: PageQueryDto,
  ): Promise<PostPageDto> {
    const rows = await this.postDatabaseService.findPostsOfOwner({
      ownerId,
      viewerId,
      limit,
      cursor: cursor ? decodeCursor(cursor) : undefined,
    });

    return toPage(rows, limit, toPostResponse, (row) => ({
      createdAt: row.createdCursor,
      id: row.postId,
    }));
  }

  async like(userId: string, postId: string): Promise<PostResponseDto> {
    await this.getPost(postId, userId);
    await this.postDatabaseService.like(postId, userId);

    return this.getPost(postId, userId);
  }

  async unlike(userId: string, postId: string): Promise<PostResponseDto> {
    await this.getPost(postId, userId);
    await this.postDatabaseService.unlike(postId, userId);

    return this.getPost(postId, userId);
  }

  async remove(userId: string, postId: string): Promise<void> {
    const isDeleted = await this.postDatabaseService.deletePost(postId, userId);

    if (!isDeleted) throw new NotFoundException('Post not found');
  }

  private async getPost(
    postId: string,
    viewerId: string,
  ): Promise<PostResponseDto> {
    const post = await this.postDatabaseService.findPost(postId, viewerId);

    if (!post) throw new NotFoundException('Post not found');

    return toPostResponse(post);
  }
}
