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
  Put,
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

import { ChatService } from './chat.service';
import { ChatDto, ChatIdDto, ChatSummaryDto } from './dto/chat-response.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'Chat not found or not a member' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('/create')
  @ApiCreatedResponse({
    type: ChatIdDto,
    description: 'The existing chat when one has exactly these members',
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() { userIds }: CreateChatDto,
  ): Promise<ChatIdDto> {
    return { chatId: await this.chatService.create(user.id, userIds) };
  }

  @Get()
  @ApiOkResponse({ type: [ChatSummaryDto] })
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

  @Put('/update')
  @ApiOkResponse({ type: ChatSummaryDto })
  update(
    @CurrentUser() user: AuthUser,
    @Body() updateChatDto: UpdateChatDto,
  ): Promise<ChatSummaryDto> {
    return this.chatService.updateChatName(user.id, updateChatDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.chatService.deleteChat(user.id, id);
  }
}
