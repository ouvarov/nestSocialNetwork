import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';
import { CREDENTIALS_RATE_LIMIT } from '@/auth/rate-limits';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
} from '@/auth/refresh-cookie';
import { PageQueryDto } from '@/common/pagination/page-query.dto';
import type { Env } from '@/config/env.schema';

import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ProfileResponseDto,
  UserPageDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UserService } from './user.service';

const PROFILE_UPDATE_RATE_LIMIT = { default: { ttl: 60_000, limit: 10 } };

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UserController {
  private readonly isProduction: boolean;

  constructor(
    private readonly userService: UserService,
    configService: ConfigService<Env, true>,
  ) {
    this.isProduction =
      configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Get()
  @ApiOkResponse({ type: UserPageDto })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() pageQuery: PageQueryDto,
  ): Promise<UserPageDto> {
    return this.userService.findAll(user.id, pageQuery);
  }

  @Patch('me')
  @Throttle(PROFILE_UPDATE_RATE_LIMIT)
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid field, or an avatar upload that is not yours',
  })
  @ApiTooManyRequestsResponse()
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.userService.updateProfile(user.id, updateProfileDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProfileResponseDto> {
    return this.userService.findProfile(id, user.id);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(CREDENTIALS_RATE_LIMIT)
  @ApiNoContentResponse({
    description:
      'Deletes the account, its posts and likes; messages stay with the other person without a sender',
  })
  @ApiForbiddenResponse({ description: 'Wrong password' })
  @ApiTooManyRequestsResponse()
  async deleteMe(
    @CurrentUser() user: AuthUser,
    @Body() { password }: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.userService.deleteAccount(user.id, password);
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      clearRefreshCookieOptions(this.isProduction),
    );
  }
}
