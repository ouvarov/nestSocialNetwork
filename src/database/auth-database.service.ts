import { Inject, Injectable } from '@nestjs/common';

import { Users, type User } from '@/database/schemas/users.schema';
import { drizzle } from 'drizzle-orm/postgres-js';

@Injectable()
export class AuthDatabaseService {
  constructor(
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
  }): Promise<User> {
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
