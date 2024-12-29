import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { plainToClass } from 'class-transformer';

import { UserDto } from '@/user/dto/user.dto';
import { UserService } from '@/user/user.service';
import { LoginAuthDto } from '@/auth/dto/login-auth.dto';
import { CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { AuthDatabaseService } from '@/database/auth-database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly authDatabaseOrmService: AuthDatabaseService,
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
  ): Promise<{ access_token: string; userData: UserDto }> {
    const { userName, email, password } = createUserDto;

    try {
      const getUser = await this.authDatabaseOrmService.createUser({
        userName,
        email,
        password,
      });

      const responseUserData = plainToClass(UserResponseDto, getUser, {
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
    } catch (error) {
      console.log(error);
      if (error.code === '23505') {
        throw new HttpException(
          `A user with the email ${email} already exists.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        'An unexpected error occurred. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
