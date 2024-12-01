import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/create')
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatService.create(createChatDto.userIds);
  }

  @Get()
  findAll() {
    return this.chatService.findAll();
  }

  @Get('/find/:id')
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }
}
