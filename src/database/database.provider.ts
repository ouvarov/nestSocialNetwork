import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

@Injectable()
export class DatabaseProvider {
  private db;

  constructor(private readonly configService: ConfigService) {
    const dbHost = this.configService.get<string>('DB_HOST') || 'localhost';
    const dbPort = this.configService.get<number>('DB_PORT') || 5432;
    const dbUser = this.configService.get<string>('POSTGRES_USER') || 'user';
    const dbPassword =
      this.configService.get<string>('POSTGRES_PASSWORD') || 'password';
    const dbName = this.configService.get<string>('POSTGRES_DB') || 'mydb';

    const sqlClient = postgres({
      user: dbUser,
      host: dbHost,
      database: dbName,
      password: dbPassword,
      port: dbPort,
    });

    this.db = drizzle(sqlClient);
  }

  getDbInstance() {
    return this.db;
  }
}
