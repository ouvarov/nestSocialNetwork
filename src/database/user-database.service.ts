import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.provider';
import { UserEntity } from '../user/entities/user.entity';

@Injectable()
export class UserDatabaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByEmail(email: string): Promise<UserEntity> {
    const query = `
        SELECT * FROM Users
        WHERE email = $1;
    `;

    const result = await this.databaseService.query(query, [email]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findById(id: string) {
    const query = `
      SELECT * FROM Users
      WHERE user_id = $1;
    `;

    const result = await this.databaseService.query(query, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findAll() {
    const query = `
      SELECT * FROM Users;
    `;

    const result = await this.databaseService.query(query);

    return result.rows;
  }
}
