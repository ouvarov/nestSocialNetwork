import { Controller, Get, Post, Body, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

import { Response, Request } from 'express';

import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/auth/auth.service';
import { LoginAuthDto } from '@/auth/dto/login-auth.dto';
import { CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { CreateUserPipe } from '@/auth/pipes/CreateUserPipe';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({
    type: CreateAuthDto,
    examples: {
      example1: {
        summary: 'Basic example',
        value: {
          userName: 'john_doe',
          password: 'securePassword123',
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created.',
    schema: {
      example: {
        message: 'User created successfully',
        access_token: 'string',
        userData: {
          userName: 'john_doe',
          id: '1',
          imageUrl: null,
          following: ['1'],
          followers: ['1'],
          description: '',
          created: '',
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @Post('/create')
  async create(
    @Body(CreateUserPipe) createAuthDto: CreateAuthDto,
    @Res() res: Response,
  ) {
    console.log(createAuthDto);
    const result = await this.authService.create(createAuthDto, res);
    return res.json(result);
  }

  @ApiOperation({ summary: 'Validate refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Refresh token is valid.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  @Get('/validate-refresh')
  async validateRefreshToken(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.validationRefreshToken(
      req.cookies[this.configService.get<string>('REFRESH_TOKEN_SECRET')],
    );

    return res.json(result);
  }

  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully.' })
  @ApiResponse({ status: 400, description: 'Failed to log out.' })
  @Post('/logout')
  async logout(@Res() res: Response) {
    const result = await this.authService.logout(res);

    return res.json(result);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiBody({
    type: LoginAuthDto,
    examples: {
      example1: {
        summary: 'Basic example',
        value: {
          password: 'securePassword123',
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created.',
    schema: {
      example: {
        message: 'User created successfully',
        access_token: 'string',
        userData: {
          userName: 'john_doe',
          id: '1',
          imageUrl: null,
          following: ['1'],
          followers: ['1'],
          description: '',
          created: '',
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
  })
  @Post('/login')
  async login(@Body() loginAuthDto: LoginAuthDto, @Res() res: Response) {
    const result = await this.authService.login(loginAuthDto, res);

    return res.json(result);
  }
}
