import { Controller, Delete, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';

import { FollowStateDto } from './dto/user-response.dto';
import { FollowService } from './follow.service';

const FOLLOW_RATE_LIMIT = { default: { ttl: 60_000, limit: 30 } };

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@Throttle(FOLLOW_RATE_LIMIT)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Put(':id/follow')
  @ApiOkResponse({ type: FollowStateDto, description: 'Idempotent' })
  @ApiBadRequestResponse({ description: 'You cannot follow yourself' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiTooManyRequestsResponse()
  follow(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FollowStateDto> {
    return this.followService.follow(user.id, id);
  }

  @Delete(':id/follow')
  @ApiOkResponse({ type: FollowStateDto, description: 'Idempotent' })
  @ApiBadRequestResponse({ description: 'You cannot follow yourself' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiTooManyRequestsResponse()
  unfollow(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FollowStateDto> {
    return this.followService.unfollow(user.id, id);
  }
}
