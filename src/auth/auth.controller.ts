import { Controller, Get, Post, Body, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { HashPasswordPipe } from './pipes/CreateUserPipe';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('/create')
  create(
    @Body(HashPasswordPipe) createAuthDto: CreateAuthDto,
    @Res() res: Response,
  ) {
    return this.authService.create(createAuthDto, res);
  }

  @Get('/validate-refresh')
  validateRefreshToken(@Req() req: Request) {
    const { refreshToken } = req.cookies;
    return this.authService.validationRefreshToken(refreshToken);
  }
}
