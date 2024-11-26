import { Controller, Get, Post, Body, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { CreateUserPipe } from './pipes/CreateUserPipe';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/create')
  async create(
    @Body(CreateUserPipe) createAuthDto: CreateAuthDto,
    @Res() res: Response,
  ) {
    const result = await this.authService.create(createAuthDto, res);
    return res.json(result);
  }
  @Get('/validate-refresh')
  async validateRefreshToken(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.validationRefreshToken(
      req.cookies[this.configService.get<string>('REFRESH_TOKEN_SECRET')],
    );

    return res.json(result);
  }

  @Post('/logout')
  async logout(@Res() res: Response) {
    const result = await this.authService.logout(res);

    return res.json(result);
  }
  @Post('/login')
  async login(@Body() loginAuthDto: LoginAuthDto, @Res() res: Response) {
    const result = await this.authService.login(loginAuthDto, res);
    return res.json(result);
  }
}
