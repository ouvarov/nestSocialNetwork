import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('chat')
@ApiTags('Chat')
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.findOne(id);
  }

  @Put('/update')
  update(@Body() updateChatDto: UpdateChatDto) {
    return this.chatService.updateChatName(updateChatDto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.deleteChat(id);
  }
}
