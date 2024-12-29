import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { UserModule } from '@/user/user.module';
import { UserService } from '@/user/user.service';
import { DatabaseModule } from '@/database/database.module';
import { DatabaseProvider } from '@/database/database.provider';
import { AuthDatabaseService } from '@/database/auth-database.service';

@Module({
  providers: [
    JwtStrategy,
    AuthService,
    UserService,
    AuthDatabaseService,
    DatabaseProvider,
    AuthDatabaseService,
  ],
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    UserModule,
    DatabaseModule,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
