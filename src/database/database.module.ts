import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '@/config/env.schema';
import * as postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { UserDatabaseOrmService } from '@/database/user-database.service';

@Module({
  imports: [ConfigModule],
  providers: [
    UserDatabaseOrmService,
    {
      provide: 'DATABASE_POOL',
      useFactory: (configService: ConfigService<Env, true>) => {
        const connectionString = configService.get('DATABASE_URL', {
          infer: true,
        });
        return postgres(connectionString, { prepare: false });
      },
      inject: [ConfigService],
    },
    {
      provide: 'DRIZZLE_ORM',
      useFactory: (sqlClient: postgres.Sql) => drizzle(sqlClient),
      inject: ['DATABASE_POOL'],
    },
  ],
  exports: [UserDatabaseOrmService, 'DRIZZLE_ORM'],
})
export class DatabaseModule {}
