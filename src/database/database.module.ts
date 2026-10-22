import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { DatabaseProvider } from './database.provider';
import { UserDatabaseOrmService } from '@/database/user-database.service';

@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseProvider,
    UserDatabaseOrmService,
    {
      provide: 'DATABASE_POOL',
      useFactory: (configService: ConfigService) => {
        const connectionString =
          configService.getOrThrow<string>('DATABASE_URL');
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
  exports: [DatabaseProvider, UserDatabaseOrmService, 'DRIZZLE_ORM'],
})
export class DatabaseModule {}
