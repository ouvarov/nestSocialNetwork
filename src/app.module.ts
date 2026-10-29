import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import type Redis from 'ioredis';

import { JwtAuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { createThrottlerStorage } from './common/throttler/create-throttler-storage';
import { type Env, validateEnv } from './config/env.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MessageModule } from './message/message.module';
import { PostModule } from './post/post.module';
import { REDIS_CLIENT, RedisModule } from './redis/redis.module';
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
    RedisModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT, ConfigService],
      useFactory: (redis: Redis | null, config: ConfigService<Env, true>) => ({
        throttlers: [DEFAULT_RATE_LIMIT],
        skipIf: () => config.get('RATE_LIMIT_DISABLED', { infer: true }),
        storage: createThrottlerStorage(redis),
      }),
    }),
    AuthModule,
    UserModule,
    PostModule,
    DatabaseModule,
    ChatModule,
    MessageModule,
    UploadModule,
    HealthModule,
  ],
})
export class AppModule {}
