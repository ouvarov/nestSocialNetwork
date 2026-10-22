import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { Module } from '@nestjs/common';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheStoreFactory } from '@nestjs/common/cache';
import { ChatModule } from './chat/chat.module';
import { MessageModule } from './message/message.module';
import { CacheDataModule } from './cache/cache.module';
import { UploadModule } from './upload/upload.module';
import { DatabaseModule } from './database/database.module';
import { validateEnv, type Env } from './config/env.schema';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/auth.guard';

@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>): CacheOptions => ({
        store: redisStore as unknown as CacheStoreFactory,
        host: configService.get('REDIS_HOST', { infer: true }),
        port: configService.get('REDIS_PORT', { infer: true }),
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
