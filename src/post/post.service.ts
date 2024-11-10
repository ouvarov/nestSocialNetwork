import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';

import { plainToClass } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto';
import { AuthService } from '../auth/auth.service';
import { PostDatabaseService } from '../database/post-database.module';

@Injectable()
export class PostService {
  constructor(
    private readonly authService: AuthService,
    private readonly postDatabaseService: PostDatabaseService,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    token: string,
  ): Promise<{ postData: PostResponseDto }> {
    const user = await this.authService.validationRefreshToken(token);
    console.log(user);
    const { text, imageUrl } = createPostDto;

    const post = await this.postDatabaseService.createPost({
      userId: user.userData.id,
      imageUrl,
      text,
    });

    const responsePostData = plainToClass(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });

    const data = {
      postData: { ...responsePostData },
    };

    return data;
  }

  async find(id: string): Promise<{ postsData: PostResponseDto[] }> {
    const findAllPosts = await this.postDatabaseService.allPosts(id);

    const postsData = findAllPosts?.map((post) => {
      const postObject = post;
      return plainToClass(PostResponseDto, postObject, {
        excludeExtraneousValues: true,
      });
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

    console.log(user, ' user');

    const userId: string = user.userData.id;
    const post = await this.postDatabaseService.toggleLikeOnPost({
      postId: id,
      userId,
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

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

    const deletePost = await this.postDatabaseService.deletePost({
      postId: id,
      userId,
    });

    const postData = plainToClass(PostResponseDto, deletePost, {
      excludeExtraneousValues: true,
    });

    return postData;
  }
}
