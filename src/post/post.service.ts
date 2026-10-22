import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';

import { plainToClass } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto';
import { PostDatabaseOrmService } from '@/database/post-database.service';
import { CacheService } from '@/cache/cache.service';

type PostRows = Awaited<ReturnType<PostDatabaseOrmService['allPosts']>>;

@Injectable()
export class PostService {
  constructor(
    private readonly postOrmDatabaseService: PostDatabaseOrmService,
    private readonly cacheService: CacheService,
  ) {}

  async create(
    userId: string,
    { text, imageUrl }: CreatePostDto,
  ): Promise<{ postData: PostResponseDto }> {
    const post = await this.postOrmDatabaseService.createPost({
      userId,
      imageUrl,
      text,
    });

    const cacheKey = `post:${userId}`;

    await this.cacheService.deleteCache(cacheKey);

    const responsePostData = plainToClass(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });

    const data = {
      postData: { ...responsePostData },
    };

    return data;
  }

  async find(id: string): Promise<{ postsData: any }> {
    const cacheKey = `post:${id}`;
    let findAllPosts = await this.cacheService.getCache<PostRows>(cacheKey);

    console.log(findAllPosts, cacheKey);

    if (!findAllPosts) {
      findAllPosts = await this.postOrmDatabaseService.allPosts(id);
      await this.cacheService.setCache(cacheKey, findAllPosts);
    }

    const postsData = findAllPosts?.map((post) => {
      const postObject = post;
      const postDto = plainToClass(PostResponseDto, postObject, {
        excludeExtraneousValues: true,
      });

      return { ...postDto };
    });

    const data = {
      postsData: postsData,
    };

    return data;
  }

  async like(userId: string, id: string) {
    const post = await this.postOrmDatabaseService.toggleLikeOnPost({
      postId: id,
      userId,
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const cacheKey = `post:${post.owner_id}`;

    await this.cacheService.deleteCache(cacheKey);

    const postData = plainToClass(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });

    return postData;
  }

  async remove(userId: string, id: string): Promise<any> {
    const cacheKey = `post:${userId}`;

    await this.cacheService.deleteCache(cacheKey);

    const deletePost = await this.postOrmDatabaseService.deletePost({
      postId: id,
      userId,
    });

    const postData = plainToClass(PostResponseDto, deletePost, {
      excludeExtraneousValues: true,
    });

    return postData;
  }
}
