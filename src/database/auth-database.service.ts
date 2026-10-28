import { Inject, Injectable } from '@nestjs/common';

import { Users, type User } from '@/database/schemas/users.schema';
import { DRIZZLE, type Database } from '@/database/drizzle';

@Injectable()
export class AuthDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createUser({
    userName,
    email,
    password,
  }: {
    userName: string;
    email: string;
    password: string;
  }): Promise<User> {
    const user = await this.db
      .insert(Users)
      .values({
        user_name: userName,
        email,
        password,
      })
      .returning();

    return user[0];
  }
}
