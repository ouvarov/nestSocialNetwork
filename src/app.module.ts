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
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { CacheDataModule } from './cache/cashe.module';
import { UploadModule } from './upload/upload.module';

const environment = process.env.NODE_ENV || 'development';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        `.env.${environment}`,
        `.env.${environment}.local`,
        '.env.test.local',
      ],
      isGlobal: true,
      validationSchema: Joi.object({
        DB_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<CacheOptions> => ({
        store: redisStore as unknown as CacheStoreFactory,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        max: 1000,
        ttl: 3600,
      }),
    }),
    AuthModule,
    UserModule,
    PostModule,
    DatabaseModule,
    ChatModule,
    MessageModule,
    CacheDataModule,
    UploadModule,
  ],
})
export class AppModule {}
