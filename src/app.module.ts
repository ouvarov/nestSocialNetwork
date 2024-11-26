import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import * as process from 'process';
import * as Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { Module } from '@nestjs/common';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheStoreFactory } from '@nestjs/common/cache';

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
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<CacheOptions<any>> => ({
        store: redisStore as unknown as CacheStoreFactory,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 5432),
        ttl: 300,
      }),
    }),
    AuthModule,
    UserModule,
    MongooseModule.forRoot(process.env.DB_URL),
    PostModule,
    DatabaseModule,
  ],
})
export class AppModule {}
