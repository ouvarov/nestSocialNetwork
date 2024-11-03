import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePostDto } from './dto/create-post.dto';

import { Post } from './post.shema';
import { plainToClass } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PostService {
  @InjectModel(Post.name) private PostModel: Model<Post>;
  @Inject(AuthService)
  private readonly authService: AuthService;
  async create(
    createPostDto: CreatePostDto,
    token: string,
  ): Promise<{ postData: PostResponseDto }> {
    const user = await this.authService.validationRefreshToken(token);
    const createPost = new this.PostModel({
      ...createPostDto,
      ownerId: user.userData.id,
    });

    const post = await createPost.save();

    const responsePostData = plainToClass(PostResponseDto, post.toObject(), {
      excludeExtraneousValues: true,
    });

    const data = {
      postData: responsePostData,
    };

    return data;
  }

  async find(id: string): Promise<{ postsData: PostResponseDto[] }> {
    const findAllPosts = await this.PostModel.find({ ownerId: id }).exec();

    const postsData = findAllPosts.map((post) => {
      const postObject = post.toObject();
      return plainToClass(
        PostResponseDto,
        {
          ...postObject,
          _id: postObject._id.toString(),
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

    const data = {
      postsData: postsData,
    };

    return data;
  }

  async like(id: string, token: string) {
    const user = await this.authService.validationRefreshToken(token);
    const post = await this.PostModel.findOne({ _id: id }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userId: string = user.userData.id;

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    const postObject = post.toObject();

    const postData = plainToClass(
      PostResponseDto,
      {
        ...postObject,
        _id: postObject._id.toString(),
      },
      {
        excludeExtraneousValues: true,
      },
    );

    return postData;
  }

  async remove(id: string, token: string): Promise<any> {
    const user = await this.authService.validationRefreshToken(token);

    const deletePost = await this.PostModel.deleteOne({
      _id: id,
      ownerId: user.userData.id,
    }).exec();

    return deletePost;
  }
}
