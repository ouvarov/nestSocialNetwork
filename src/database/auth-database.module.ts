import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.provider';
import { UserEntity } from '../user/entities/user.entity';

@Injectable()
export class AuthDatabaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createUser({
    userName,
    email,
    password,
  }: {
    userName: string;
    email: string;
    password: string;
  }): Promise<UserEntity> {
    const query = `
        INSERT INTO Users (user_name, email, password)
        VALUES ($1, $2, $3)
        RETURNING user_id, user_name, image_url, following, followers, description, created;
    `;

    const values = [userName, email, password];

    const result = await this.databaseService.query(query, values);

    const user = result.rows[0];

    return user;
  }
}
