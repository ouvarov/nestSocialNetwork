import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CreateAuthDto } from './dto/create-auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    private readonly jwtService: JwtService,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
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

    const responseUserData = plainToClass(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });

    const data = {
      access_token: this.generateAccessToken(user._id),
      userData: { ...responseUserData, id: user._id },
    };

    return data;
  }

  async create(
    createUserDto: CreateAuthDto,
    res: Response,
  ): Promise<{ access_token: string; userData: UserResponseDto }> {
    const createdUser = new this.UserModel(createUserDto);

    const user = await createdUser.save();

    const refreshToken = this.generateRefreshToken(user._id);

    res.cookie(this.refreshTokenSecret, refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const responseUserData = plainToClass(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });

    const data = {
      access_token: this.generateAccessToken(user._id),
      userData: responseUserData,
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
      throw new HttpException('bad credentials', HttpStatus.BAD_REQUEST);
    }

    const refreshToken = this.generateRefreshToken(user._id);

    res.cookie(this.refreshTokenSecret, refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const responseUserData = plainToClass(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });

    const data = {
      access_token: this.generateAccessToken(user._id),
      userData: responseUserData,
    };

    return data;
  }
}
