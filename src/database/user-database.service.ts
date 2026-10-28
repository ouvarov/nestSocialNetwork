import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, notExists, sql } from 'drizzle-orm';

import type { Cursor } from '@/common/pagination/cursor';
import { DRIZZLE, type Database } from '@/database/drizzle';
import { ChatMembers } from '@/database/schemas/chatMembers.schema';
import { Chats } from '@/database/schemas/chats.schema';
import { Users, type User } from '@/database/schemas/users.schema';

type PublicUser = Pick<
  User,
  'user_id' | 'user_name' | 'image_url' | 'description' | 'created'
>;

type PublicUserRow = PublicUser & { createdCursor: string };

const publicColumns = {
  user_id: Users.user_id,
  user_name: Users.user_name,
  image_url: Users.image_url,
  description: Users.description,
  created: Users.created,
} satisfies Record<keyof PublicUser, unknown>;

@Injectable()
export class UserDatabaseOrmService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(Users)
      .where(eq(sql`lower(${Users.email})`, email.toLowerCase()));

    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(Users)
      .where(eq(Users.user_id, id));

    return user ?? null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const [user] = await this.db
      .select(publicColumns)
      .from(Users)
      .where(eq(Users.user_id, id));

    return user ?? null;
  }

  async exists(id: string): Promise<boolean> {
    const [user] = await this.db
      .select({ id: Users.user_id })
      .from(Users)
      .where(eq(Users.user_id, id));

    return user !== undefined;
  }

  findPublicPage({
    limit,
    cursor,
  }: {
    limit: number;
    cursor?: Cursor;
  }): Promise<PublicUserRow[]> {
    const isBeforeCursor = cursor
      ? sql`(${Users.created}, ${Users.user_id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : undefined;

    return this.db
      .select({
        ...publicColumns,
        createdCursor: sql<string>`${Users.created}::text`,
      })
      .from(Users)
      .where(isBeforeCursor)
      .orderBy(desc(Users.created), desc(Users.user_id))
      .limit(limit + 1);
  }

  deleteUser(userId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const memberships = await tx
        .select({ chatId: ChatMembers.chat_id })
        .from(ChatMembers)
        .where(eq(ChatMembers.user_id, userId));

      const deleted = await tx
        .delete(Users)
        .where(eq(Users.user_id, userId))
        .returning({ id: Users.user_id });

      if (deleted.length === 0) return false;
      if (memberships.length === 0) return true;

      const remainingMembers = tx
        .select({ userId: ChatMembers.user_id })
        .from(ChatMembers)
        .where(eq(ChatMembers.chat_id, Chats.chat_id));

      await tx.delete(Chats).where(
        and(
          inArray(
            Chats.chat_id,
            memberships.map(({ chatId }) => chatId),
          ),
          notExists(remainingMembers),
        ),
      );

      return true;
    });
  }
}

export type { PublicUser, PublicUserRow };
