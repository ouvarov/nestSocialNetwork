import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import { ConfigService } from '@nestjs/config';

const createDbConnection = (configService: ConfigService) => {
  const sqlClient = postgres({
    host: configService.get<string>('DB_HOST'),
    port: Number(configService.get<number>('DB_PORT')),
    username: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DB'),
  });

  return drizzle(sqlClient);
};

export { createDbConnection };
