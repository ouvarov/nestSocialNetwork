import { Module } from '@nestjs/common';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';
import { CacheStoreFactory } from '@nestjs/common/cache';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import * as redisStore from 'cache-manager-redis-store';

import { JwtAuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CacheDataModule } from './cache/cache.module';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { ChatModule } from './chat/chat.module';
import { validateEnv, type Env } from './config/env.schema';
import { DatabaseModule } from './database/database.module';
import { MessageModule } from './message/message.module';
import { PostModule } from './post/post.module';
import { UploadModule } from './upload/upload.module';
import { UserModule } from './user/user.module';

const DEFAULT_RATE_LIMIT = { ttl: 60_000, limit: 100 };

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([DEFAULT_RATE_LIMIT]),
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
