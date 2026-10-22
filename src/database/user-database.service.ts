import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { drizzle } from 'drizzle-orm/postgres-js';
import { Users, type User } from '@/database/schemas/users.schema';

@Injectable()
export class UserDatabaseOrmService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.Drizzle.select()
      .from(Users)
      .where(eq(Users.email, email));

    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.Drizzle.select()
      .from(Users)
      .where(eq(Users.user_id, id));

    return user || null;
  }

  async findAll(): Promise<User[]> {
    return await this.Drizzle.select().from(Users);
  }
}
