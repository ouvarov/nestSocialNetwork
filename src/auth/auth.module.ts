import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '@/config/env.schema';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { UserModule } from '@/user/user.module';
import { UserService } from '@/user/user.service';
import { DatabaseModule } from '@/database/database.module';
import { AuthDatabaseService } from '@/database/auth-database.service';

@Module({
  providers: [
    JwtStrategy,
    AuthService,
    UserService,
    AuthDatabaseService,
    AuthDatabaseService,
  ],
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    UserModule,
    DatabaseModule,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
