import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CreateAuthDto } from './dto/create-auth.dto';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcryptjs';
import { AuthDatabaseService } from '../database/auth-database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly authDatabaseService: AuthDatabaseService,
  ) {}

  private readonly refreshTokenSecret = this.configService.get<string>(
    'REFRESH_TOKEN_SECRET',
  );

  generateAccessToken(userId): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(userId): string {
    const payload = { sub: userId };
    return jwt.sign(payload, this.refreshTokenSecret, { expiresIn: '30d' });
  }

  async validationRefreshToken(token) {
    const userData = jwt.verify(token, this.refreshTokenSecret);

    const user = await this.userService.findOneById(userData.sub as string);

    const responseUserData = plainToClass(
      UserResponseDto,
      { ...user, id: user.user_id.toString() },
      {
        excludeExtraneousValues: true,
      },
    );

    const data = {
      access_token: this.generateAccessToken(responseUserData.id),
      userData: responseUserData,
    };

    return data;
  }

  async create(
    createUserDto: CreateAuthDto,
    res: Response,
  ): Promise<{ access_token: string; userData: UserResponseDto }> {
    const { email, password, userName } = createUserDto;

    const user = await this.authDatabaseService.createUser({
      email,
      password,
      userName,
    });

    const responseUserData = plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    const refreshToken = this.generateRefreshToken(responseUserData.id);

    res.cookie(this.refreshTokenSecret, refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const data = {
      access_token: this.generateAccessToken(responseUserData.id),
      userData: { ...responseUserData },
    };

    return data;
  }

  logout(res: Response) {
    res.clearCookie(this.refreshTokenSecret);

    return null;
  }

  async login(
    loginAuthDto: LoginAuthDto,
    res: Response,
  ): Promise<{ access_token: string; userData: UserResponseDto }> {
    const { email, password } = loginAuthDto;

    const user = await this.userService.findOneByEmail(email);

    const isPasswordEquals = await bcrypt.compare(password, user.password);

    if (!user || !isPasswordEquals) {
      throw new HttpException('bad credentials', HttpStatus.FORBIDDEN);
    }

    const responseUserData = plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    const refreshToken = this.generateRefreshToken(responseUserData.id);

    res.cookie(this.refreshTokenSecret, refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const data = {
      access_token: this.generateAccessToken(responseUserData.id),
      userData: responseUserData,
    };

    return data;
  }
}
