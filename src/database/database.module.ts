import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Env } from '@/config/env.schema';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { UserDatabaseOrmService } from '@/database/user-database.service';

const DATABASE_POOL = 'DATABASE_POOL';
const SHUTDOWN_TIMEOUT_SECONDS = 5;

@Module({
  imports: [ConfigModule],
  providers: [
    UserDatabaseOrmService,
    {
      provide: DATABASE_POOL,
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
      inject: [DATABASE_POOL],
    },
  ],
  exports: [UserDatabaseOrmService, 'DRIZZLE_ORM'],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_POOL) private readonly sqlClient: postgres.Sql,
  ) {}

  async onApplicationShutdown() {
    await this.sqlClient.end({ timeout: SHUTDOWN_TIMEOUT_SECONDS });
  }
}
