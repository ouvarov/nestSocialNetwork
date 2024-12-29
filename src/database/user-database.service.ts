import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { UserDataDto } from '@/user/dto/user-data.dto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Users } from '@/database/schemas/users.schema';

@Injectable()
export class UserDatabaseOrmService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async findByEmail(email: string): Promise<UserDataDto | null> {
    const [user] = await this.Drizzle.select()
      .from(Users)
      .where(eq(Users.email, email));

    return user || null;
  }

  async findById(id: string): Promise<UserDataDto | null> {
    const [user] = await this.Drizzle.select()
      .from(Users)
      .where(eq(Users.user_id, id));

    return user || null;
  }

  async findAll(): Promise<UserDataDto[]> {
    return await this.Drizzle.select().from(Users);
  }
}
