import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import * as process from 'process';
import * as Joi from 'joi';
// import { TypeOrmModule } from '@nestjs/typeorm';

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
    // TypeOrmModule.forRoot({
    //   type: 'postgres',
    //   host: 'localhost',
    //   port: 5432,
    //   username: process.env.POSTGRES_USER || 'user',
    //   password: process.env.POSTGRES_PASSWORD || 'password',
    //   database: process.env.POSTGRES_DB || 'mydb',
    //   autoLoadEntities: true,
    //   synchronize: true,
    // }),
    PostModule,
  ],
})
export class AppModule {}
