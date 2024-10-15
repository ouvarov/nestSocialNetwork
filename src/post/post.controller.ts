import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('post')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('/create')
  async create(@Body() createPostDto: CreatePostDto, @Res() res: Response) {
    const result = await this.postService.create(createPostDto);

    return res.json(result);
  }

  @Post('/getPosts')
  async find(@Body() data: { id: string }, @Res() res: Response) {
    const result = await this.postService.find(data.id);

    return res.json(result);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(+id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postService.remove(+id);
  }
}
