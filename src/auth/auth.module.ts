import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '@/config/env.schema';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';

import { UserModule } from '@/user/user.module';
import { DatabaseModule } from '@/database/database.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { AuthDatabaseService } from '@/database/auth-database.service';
import { RefreshTokenDatabaseService } from '@/database/refresh-token-database.service';

const ACCESS_TOKEN_TTL = '15m';

@Module({
  providers: [
    JwtStrategy,
    AuthService,
    AuthDatabaseService,
    RefreshTokenDatabaseService,
    RefreshTokenCleanupService,
  ],
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
    UserModule,
    DatabaseModule,
    RealtimeModule,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
