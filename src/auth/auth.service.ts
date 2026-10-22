import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { plainToClass } from 'class-transformer';
import { randomUUID } from 'node:crypto';

import type { Env } from '@/config/env.schema';
import { CreateAuthDto } from '@/auth/dto/create-auth.dto';
import { LoginAuthDto } from '@/auth/dto/login-auth.dto';
import { AuthDatabaseService } from '@/database/auth-database.service';
import { getPostgresErrorCode } from '@/database/postgres-error';
import { RefreshTokenDatabaseService } from '@/database/refresh-token-database.service';
import type { User } from '@/database/schemas/users.schema';
import { UserResponseDto } from '@/user/dto/user-response.dto';
import { UserService } from '@/user/user.service';

import { REFRESH_TOKEN_TTL_MS } from './refresh-cookie';

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
};

type RefreshTokenPayload = { sub: string; jti: string; typ: string };

const PASSWORD_HASH_ROUNDS = 12;
const UNIQUE_VIOLATION = '23505';
const INVALID_CREDENTIALS = 'Invalid credentials';
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'timing-safe-comparison-for-unknown-emails',
  PASSWORD_HASH_ROUNDS,
);

const toUserResponse = (user: User) =>
  plainToClass(UserResponseDto, user, { excludeExtraneousValues: true });

@Injectable()
export class AuthService {
  private readonly refreshTokenSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authDatabaseService: AuthDatabaseService,
    private readonly refreshTokenDatabaseService: RefreshTokenDatabaseService,
    configService: ConfigService<Env, true>,
  ) {
    this.refreshTokenSecret = configService.get('REFRESH_TOKEN_SECRET', {
      infer: true,
    });
  }

  async register({
    userName,
    email,
    password,
  }: CreateAuthDto): Promise<AuthSession> {
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

    try {
      const user = await this.authDatabaseService.createUser({
        userName,
        email,
        password: passwordHash,
      });

      return await this.startSession(user);
    } catch (error) {
      if (getPostgresErrorCode(error) === UNIQUE_VIOLATION) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login({ email, password }: LoginAuthDto): Promise<AuthSession> {
    const user = await this.userService.findOneByEmail(email);
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.startSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSession> {
    const { jti } = await this.verifyRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenDatabaseService.findById(jti);

    if (!storedToken) throw new UnauthorizedException();

    if (storedToken.revoked_at) {
      await this.refreshTokenDatabaseService.revokeFamily(
        storedToken.family_id,
      );
      throw new UnauthorizedException();
    }

    if (storedToken.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOneById(storedToken.user_id);

    if (!user) throw new UnauthorizedException();

    const nextToken = await this.signRefreshToken(
      user.user_id,
      storedToken.family_id,
    );
    const isRotated = await this.refreshTokenDatabaseService.rotate(
      storedToken.token_id,
      nextToken.record,
    );

    if (!isRotated) {
      await this.refreshTokenDatabaseService.revokeFamily(
        storedToken.family_id,
      );
      throw new UnauthorizedException();
    }

    return {
      accessToken: await this.signAccessToken(user.user_id),
      refreshToken: nextToken.token,
      user: toUserResponse(user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken).catch(
      () => null,
    );

    if (payload) await this.refreshTokenDatabaseService.revoke(payload.jti);
  }

  private async startSession(user: User): Promise<AuthSession> {
    const refreshToken = await this.signRefreshToken(
      user.user_id,
      randomUUID(),
    );
    await this.refreshTokenDatabaseService.create(refreshToken.record);

    return {
      accessToken: await this.signAccessToken(user.user_id),
      refreshToken: refreshToken.token,
      user: toUserResponse(user),
    };
  }

  private signAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, typ: 'access' });
  }

  private async signRefreshToken(userId: string, familyId: string) {
    const tokenId = randomUUID();
    const token = await this.jwtService.signAsync(
      { sub: userId, jti: tokenId, typ: 'refresh' },
      {
        secret: this.refreshTokenSecret,
        expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
      },
    );

    return {
      token,
      record: {
        tokenId,
        userId,
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    };
  }

  private async verifyRefreshToken(
    token: string | undefined,
  ): Promise<RefreshTokenPayload> {
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        { secret: this.refreshTokenSecret },
      );

      if (payload.typ !== 'refresh') throw new UnauthorizedException();

      return payload;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

export type { AuthSession };
