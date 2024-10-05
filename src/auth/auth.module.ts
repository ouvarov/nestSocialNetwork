import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './auth.schema';
import { UserService } from '../user/user.service';

@Module({
  providers: [JwtStrategy, AuthService, UserService],
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'ACCESS_TOKEN_SECRET', // Secret should match the one in the JwtStrategy
      signOptions: { expiresIn: '15m' }, // Access token expiration
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
})
export class AuthModule {}
