import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { decodeCursor, toPage } from '@/common/pagination/cursor';
import type { PageQueryDto } from '@/common/pagination/page-query.dto';
import {
  PostDatabaseOrmService,
  type PostRow,
} from '@/database/post-database.service';
import { getPostgresErrorCode } from '@/database/postgres-error';
import { UploadDatabaseService } from '@/database/upload-database.service';
import { toImageUrl } from '@/storage/image-url';
import { StorageService } from '@/storage/storage.service';
import { UploadCleanupService } from '@/storage/upload-cleanup.service';

import type { CreatePostDto } from './dto/create-post.dto';
import type { PostPageDto, PostResponseDto } from './dto/post-response.dto';

const POSTS_PAGE_SIZE = 10;
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class PostService {
  constructor(
    private readonly postDatabaseService: PostDatabaseOrmService,
    private readonly uploadDatabaseService: UploadDatabaseService,
    private readonly uploadCleanupService: UploadCleanupService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    userId: string,
    { text, imageUploadId }: CreatePostDto,
  ): Promise<PostResponseDto> {
    if (
      imageUploadId &&
      !(await this.uploadDatabaseService.isOwnedBy(imageUploadId, userId))
    ) {
      throw new BadRequestException(
        'imageUploadId must be an image you uploaded',
      );
    }

    const postId = await this.postDatabaseService.createPost({
      userId,
      imageUploadId,
      text,
    });

    return this.getPost(postId, userId);
  }

  async findPostsOfOwner(
    ownerId: string,
    viewerId: string,
    { limit = POSTS_PAGE_SIZE, cursor }: PageQueryDto,
  ): Promise<PostPageDto> {
    const rows = await this.postDatabaseService.findPostsOfOwner({
      ownerId,
      viewerId,
      limit,
      cursor: cursor ? decodeCursor(cursor) : undefined,
    });

    return toPage(
      rows,
      limit,
      (row) => this.toPostResponse(row),
      (row) => ({ createdAt: row.createdCursor, id: row.postId }),
    );
  }

  async like(userId: string, postId: string): Promise<PostResponseDto> {
    try {
      await this.postDatabaseService.like(postId, userId);
    } catch (error) {
      if (getPostgresErrorCode(error) === FOREIGN_KEY_VIOLATION) {
        throw new NotFoundException('Post not found');
      }
      throw error;
    }

    return this.getPost(postId, userId);
  }

  async unlike(userId: string, postId: string): Promise<PostResponseDto> {
    await this.postDatabaseService.unlike(postId, userId);

    return this.getPost(postId, userId);
  }

  async remove(userId: string, postId: string): Promise<void> {
    const deleted = await this.postDatabaseService.deletePost(postId, userId);

    if (!deleted) throw new NotFoundException('Post not found');

    await this.uploadCleanupService.removeIfUnused(deleted.imageUploadId);
  }

  private async getPost(
    postId: string,
    viewerId: string,
  ): Promise<PostResponseDto> {
    const post = await this.postDatabaseService.findPost(postId, viewerId);

    if (!post) throw new NotFoundException('Post not found');

    return this.toPostResponse(post);
  }

  private toPostResponse(post: PostRow): PostResponseDto {
    return {
      id: post.postId,
      ownerId: post.ownerId,
      imageUrl: toImageUrl(this.storageService, post),
      imageWidth: post.imageWidth,
      imageHeight: post.imageHeight,
      text: post.text,
      created: post.created,
      likeCount: post.likeCount,
      likedByMe: post.likedByMe,
    };
  }
}
