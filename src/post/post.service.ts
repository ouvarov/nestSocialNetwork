import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

import { Post } from './post.shema';
import { PostEntity } from './entities/post.entity';
import { plainToClass } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto';

@Injectable()
export class PostService {
  @InjectModel(Post.name) private PostModel: Model<Post>;
  async create(
    createPostDto: CreatePostDto,
  ): Promise<{ postData: PostEntity }> {
    const createPost = new this.PostModel(createPostDto);

    const post = await createPost.save();

    const responsePostData = plainToClass(PostResponseDto, post.toObject(), {
      excludeExtraneousValues: true,
    });

    console.log(responsePostData, post);

    const data = {
      postData: responsePostData,
    };

    return data;
  }

  async find(id: string): Promise<{ postsData: PostResponseDto[] }> {
    const findAllPosts = await this.PostModel.find({ ownerId: id }).exec();

    const postsData = findAllPosts.map((post) =>
      plainToClass(PostResponseDto, post.toObject(), {
        excludeExtraneousValues: true,
      }),
    );

    const data = {
      postsData: postsData,
    };

    return data;
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
