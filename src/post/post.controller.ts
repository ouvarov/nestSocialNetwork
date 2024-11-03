import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Res,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('post')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/create')
  async create(
    @Body() createPostDto: CreatePostDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const token =
      await req.cookies[this.configService.get<string>('REFRESH_TOKEN_SECRET')];
    const result = await this.postService.create(createPostDto, token);

    return res.json(result);
  }

  @Get('/getPosts/:id')
  async find(@Param('id') id: string, @Res() res: Response) {
    const result = await this.postService.find(id);

    return res.json(result);
  }

  @Put('/like/:id')
  async like(@Body() id: string, @Req() req: Request, @Res() res: Response) {
    const token =
      await req.cookies[this.configService.get<string>('REFRESH_TOKEN_SECRET')];

    const result = await this.postService.like(id, token);

    return res.json(result);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const token =
      await req.cookies[this.configService.get<string>('REFRESH_TOKEN_SECRET')];
    const result = await this.postService.remove(id, token);

    return res.json(result);
  }
}
