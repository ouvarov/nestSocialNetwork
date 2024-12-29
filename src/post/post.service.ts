import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';

import { plainToClass } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto';
import { PostDatabaseOrmService } from '@/database/post-database.service';
import { AuthService } from '@/auth/auth.service';
import { CacheService } from '@/cache/cache.service';

@Injectable()
export class PostService {
  constructor(
    private readonly authService: AuthService,
    private readonly postOrmDatabaseService: PostDatabaseOrmService,
    private readonly cacheService: CacheService,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    token: string,
  ): Promise<{ postData: PostResponseDto }> {
    const user = await this.authService.validationRefreshToken(token);
    const { text, imageUrl } = createPostDto;

    if (user.userData.id !== createPostDto.ownerId) {
      throw new NotFoundException('User not owner');
    }

    const post = await this.postOrmDatabaseService.createPost({
      userId: user.userData.id,
      imageUrl,
      text,
    });

    const cacheKey = `post:${user.userData.id}`;

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
    let findAllPosts = await this.cacheService.getCache<any>(cacheKey);

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

  async like(id: string, token: string) {
    const user = await this.authService.validationRefreshToken(token);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userId: string = user.userData.id;
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

  async remove(id: string, token: string): Promise<any> {
    const user = await this.authService.validationRefreshToken(token);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userId: string = user.userData.id;

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
