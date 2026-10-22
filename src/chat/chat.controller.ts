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
import { ApiBearerAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';

import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'Chat not found or not a member' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/create')
  create(@CurrentUser() user: AuthUser, @Body() { userIds }: CreateChatDto) {
    return this.chatService.create(user.id, userIds);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.chatService.findAll(user.id);
  }

  @Get('/find/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.findOne(user.id, id);
  }

  @Put('/update')
  update(@CurrentUser() user: AuthUser, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.updateChatName(user.id, updateChatDto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.deleteChat(user.id, id);
  }
}
