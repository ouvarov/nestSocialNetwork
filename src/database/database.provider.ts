import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: 'user',
      host: 'localhost',
      database: 'mydb',
      password: 'password',
      port: 5432,
    });
  }

  query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  }
}
