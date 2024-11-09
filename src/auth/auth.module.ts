import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { DatabaseService } from '../database/database.provider';
import { UserModule } from '../user/user.module';
import { AuthDatabaseService } from '../database/auth-database.module';
import { UserDatabaseService } from '../database/user-database.module';

@Module({
  providers: [
    JwtStrategy,
    AuthService,
    UserService,
    DatabaseService,
    AuthDatabaseService,
    UserDatabaseService,
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
  ],
  exports: [JwtModule],
})
export class AuthModule {}
