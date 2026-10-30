import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

import { CreatePostDto } from './dto/create-post.dto';
import {
  FeedPageDto,
  PostPageDto,
  PostResponseDto,
} from './dto/post-response.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedService } from './feed.service';
import { PostService } from './post.service';

@Controller()
@ApiTags('Posts')
@ApiBearerAuth()
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly feedService: FeedService,
  ) {}

  @Get('feed')
  @ApiOkResponse({ type: FeedPageDto })
  findFeed(
    @CurrentUser() user: AuthUser,
    @Query() pageQuery: PageQueryDto,
  ): Promise<FeedPageDto> {
    return this.feedService.findFeed(user.id, pageQuery);
  }

  @Post('posts')
  @ApiCreatedResponse({ type: PostResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() createPostDto: CreatePostDto) {
    return this.postService.create(user.id, createPostDto);
  }

  @Get('users/:userId/posts')
  @ApiOkResponse({ type: PostPageDto })
  findPostsOfUser(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() pageQuery: PageQueryDto,
  ) {
    return this.postService.findPostsOfOwner(userId, user.id, pageQuery);
  }

  @Put('posts/:id/like')
  @ApiOkResponse({ type: PostResponseDto })
  @ApiNotFoundResponse({ description: 'Post not found' })
  like(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.postService.like(user.id, id);
  }

  @Delete('posts/:id/like')
  @ApiOkResponse({ type: PostResponseDto })
  @ApiNotFoundResponse({ description: 'Post not found' })
  unlike(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postService.unlike(user.id, id);
  }

  @Patch('posts/:id')
  @ApiOkResponse({ type: PostResponseDto })
  @ApiNotFoundResponse({ description: 'Post not found or not yours' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postService.update(user.id, id, updatePostDto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Post not found or not yours' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.postService.remove(user.id, id);
  }
}
