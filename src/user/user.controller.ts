import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
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
import { UserPageDto, UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

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
  findAll(@Query() pageQuery: PageQueryDto): Promise<UserPageDto> {
    return this.userService.findAll(pageQuery);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.userService.findProfile(id);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(CREDENTIALS_RATE_LIMIT)
  @ApiNoContentResponse({
    description:
      'Deletes the account, its posts and likes; messages stay with the other person without a sender',
  })
  @ApiUnauthorizedResponse({ description: 'Wrong password' })
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
