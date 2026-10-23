import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { drizzle } from 'drizzle-orm/postgres-js';
import { Users, type User } from '@/database/schemas/users.schema';

const publicColumns = {
  user_id: Users.user_id,
  user_name: Users.user_name,
  image_url: Users.image_url,
  description: Users.description,
  created: Users.created,
};

type PublicUser = Pick<User, keyof typeof publicColumns>;

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

  async findPublicById(id: string): Promise<PublicUser | null> {
    const [user] = await this.Drizzle.select(publicColumns)
      .from(Users)
      .where(eq(Users.user_id, id));

    return user ?? null;
  }

  findAllPublic(): Promise<PublicUser[]> {
    return this.Drizzle.select(publicColumns)
      .from(Users)
      .orderBy(Users.user_name);
  }
}

export type { PublicUser };
