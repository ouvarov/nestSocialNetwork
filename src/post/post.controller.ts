import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';

import { CreatePostDto } from './dto/create-post.dto';
import { LikePostDto } from './dto/like-post.dto';
import { PostService } from './post.service';

@Controller('post')
@ApiTags('Post')
@ApiBearerAuth()
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('/create')
  create(@CurrentUser() user: AuthUser, @Body() createPostDto: CreatePostDto) {
    return this.postService.create(user.id, createPostDto);
  }

  @Get('/getPosts/:id')
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.postService.find(id);
  }

  @Put('/like')
  like(@CurrentUser() user: AuthUser, @Body() { postId }: LikePostDto) {
    return this.postService.like(user.id, postId);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postService.remove(user.id, id);
  }
}
