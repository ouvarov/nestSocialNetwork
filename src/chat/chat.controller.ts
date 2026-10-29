import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';
import { PageQueryDto } from '@/common/pagination/page-query.dto';

import { ChatService } from './chat.service';
import {
  ChatDto,
  ChatIdDto,
  ChatSummaryDto,
  MessagePageDto,
} from './dto/chat-response.dto';
import { CreateChatDto } from './dto/create-chat.dto';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'Chat not found or not a member' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/create')
  @ApiCreatedResponse({
    type: ChatIdDto,
    description: 'The existing chat when you already have one with this user',
  })
  @ApiBadRequestResponse({ description: 'A chat with yourself' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() { userId }: CreateChatDto,
  ): Promise<ChatIdDto> {
    return { chatId: await this.chatService.create(user.id, userId) };
  }

  @Get()
  @ApiOkResponse({
    type: [ChatSummaryDto],
    description:
      'Most recent first; chats you cleared come back on a new message',
  })
  findAll(@CurrentUser() user: AuthUser): Promise<ChatSummaryDto[]> {
    return this.chatService.findAll(user.id);
  }

  @Get('/find/:id')
  @ApiOkResponse({ type: ChatDto })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatDto> {
    return this.chatService.findOne(user.id, id);
  }

  @Get(':id/messages')
  @ApiOkResponse({ type: MessagePageDto })
  findMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pageQuery: PageQueryDto,
  ): Promise<MessagePageDto> {
    return this.chatService.findMessages(user.id, id, pageQuery);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description:
      'Clears the history for you only; the chat is removed once nobody sees it',
  })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.chatService.clear(user.id, id);
  }
}
