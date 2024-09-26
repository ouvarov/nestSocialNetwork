import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as process from 'process';
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  generateAccessToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(userId: string): string {
    const payload = { sub: userId };
    return jwt.sign(payload, this.refreshTokenSecret, { expiresIn: '30d' });
  }

  validationRefreshToken(token) {
    const userData = jwt.verify(token, this.refreshTokenSecret);

    return userData;
  }
  async create(
    createUserDto: CreateAuthDto,
    res: Response,
  ): Promise<{ access_token: string }> {
    const createdUser = new this.UserModel(createUserDto);
    const user = createdUser.save();

    const payload: Record<string, any> = {};
    await user.then((data) => {
      payload.sub = data._id;
    });

    const refreshToken = this.generateRefreshToken(payload.sub);

    res.cookie('jwt-refresh-key', refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30days
    });

    return { access_token: this.generateAccessToken(payload.sub) };
  }
}
