import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import * as process from 'process';
import * as Joi from 'joi';

const environment = process.env.NODE_ENV || 'development';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${environment}`, `.env.${environment}.local`],
      isGlobal: true,
      validationSchema: Joi.object({
        DB_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
      }),
    }),
    AuthModule,
    UserModule,
    MongooseModule.forRoot(process.env.DB_URL),
  ],
})
export class AppModule {}
