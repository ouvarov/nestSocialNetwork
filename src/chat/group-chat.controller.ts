import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';

import { ChatIdDto } from './dto/chat-response.dto';
import {
  AddMembersDto,
  CreateGroupDto,
  GroupTitleDto,
  SetRoleDto,
  TransferOwnerDto,
} from './dto/group-chat.dto';
import { GroupChatService } from './group-chat.service';

@Controller('chat')
@ApiTags('Chat')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Invalid input or not a group' })
@ApiForbiddenResponse({ description: 'Your role does not allow this' })
@ApiNotFoundResponse({ description: 'Chat not found or not a member' })
export class GroupChatController {
  constructor(private readonly groupChatService: GroupChatService) {}

  @Post('group')
  @ApiCreatedResponse({ type: ChatIdDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() { title, memberIds }: CreateGroupDto,
  ): Promise<ChatIdDto> {
    const chatId = await this.groupChatService.create(
      user.id,
      title,
      memberIds,
    );

    return { chatId };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Renames the group' })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { title }: GroupTitleDto,
  ): Promise<void> {
    return this.groupChatService.rename(user.id, id, title);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'New people see messages only from now on',
  })
  addMembers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { userIds }: AddMembersDto,
  ): Promise<void> {
    return this.groupChatService.addMembers(user.id, id, userIds);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description:
      'Removes someone, or leaves with your own id. An owner who leaves hands over to the oldest moderator, then the oldest member',
  })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.groupChatService.removeMember(user.id, id, userId);
  }

  @Put(':id/members/:userId/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Makes or unmakes a moderator' })
  setRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() { role }: SetRoleDto,
  ): Promise<void> {
    return this.groupChatService.setRole(user.id, id, userId, role);
  }

  @Put(':id/owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Hands the group over; you become a moderator',
  })
  transferOwner(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { userId }: TransferOwnerDto,
  ): Promise<void> {
    return this.groupChatService.transferOwner(user.id, id, userId);
  }

  @Delete(':id/group')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deletes the group for everyone' })
  deleteGroup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.groupChatService.deleteGroup(user.id, id);
  }
}
