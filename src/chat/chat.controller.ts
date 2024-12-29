import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { GetChatDto } from './dto/get-chat.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('chat')
@ApiTags('Chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/create')
  create(@Body() createChatDto: CreateChatDto) {
    console.log(createChatDto.userIds);
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

  @Put('/update')
  update(@Body() updateChatDto: UpdateChatDto) {
    return this.chatService.updateChatName(updateChatDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.chatService.deleteChat(id);
  }
}
