import { Inject, Injectable } from '@nestjs/common';

import { UserDataDto } from '@/user/dto/user-data.dto';
import { Users } from '@/database/schemas/users.schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { DatabaseProvider } from '@/database/database.provider';

@Injectable()
export class AuthDatabaseService {
  constructor(
    private readonly databaseService: DatabaseProvider,
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async createUser({
    userName,
    email,
    password,
  }: {
    userName: string;
    email: string;
    password: string;
  }): Promise<UserDataDto> {
    const user = await this.Drizzle.insert(Users)
      .values({
        user_name: userName,
        email,
        password,
      })
      .returning();

    return user[0];
  }
}
