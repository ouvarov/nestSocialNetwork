import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { Env } from '@/config/env.schema';

import { AuthService, type AuthSession } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { Public } from './public.decorator';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
  readRefreshCookie,
  refreshCookieOptions,
} from './refresh-cookie';

const CREDENTIALS_RATE_LIMIT = { default: { ttl: 60_000, limit: 5 } };

@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService<Env, true>,
  ) {
    this.isProduction =
      configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Post('register')
  @Throttle(CREDENTIALS_RATE_LIMIT)
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiTooManyRequestsResponse()
  @ApiConflictResponse({ description: 'Email is already registered' })
  async register(
    @Body() createAuthDto: CreateAuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.authService.register(createAuthDto);
    return this.sendSession(response, session);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(CREDENTIALS_RATE_LIMIT)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse()
  async login(
    @Body() loginAuthDto: LoginAuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.authService.login(loginAuthDto);
    return this.sendSession(response, session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked or reused refresh token',
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.authService.refresh(readRefreshCookie(request));
    return this.sendSession(response, session);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(readRefreshCookie(request));
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      clearRefreshCookieOptions(this.isProduction),
    );
  }

  private sendSession(
    response: Response,
    { accessToken, refreshToken, user }: AuthSession,
  ): AuthResponseDto {
    response.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      refreshCookieOptions(this.isProduction),
    );

    return { access_token: accessToken, userData: user };
  }
}
