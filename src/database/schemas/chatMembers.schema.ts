import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  text,
  uuid,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { Chats } from './chats.schema';
import { Users } from './users.schema';

const CHAT_ROLES = ['owner', 'moderator', 'member'] as const;

type ChatRole = (typeof CHAT_ROLES)[number];

const ChatMembers = pgTable(
  'chat_members',
  {
    chat_id: uuid('chat_id')
      .notNull()
      .references(() => Chats.chat_id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    role: text('role', { enum: CHAT_ROLES }).notNull().default('member'),
    added_at: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    cleared_at: timestamp('cleared_at', { withTimezone: true }),
    last_read_at: timestamp('last_read_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.chat_id, table.user_id] }),
    index('chat_members_user_id_idx').on(table.user_id),
    check(
      'chat_members_role_check',
      sql`${table.role} in ('owner', 'moderator', 'member')`,
    ),
    uniqueIndex('chat_members_one_owner_uq')
      .on(table.chat_id)
      .where(sql`${table.role} = 'owner'`),
  ],
);

export { ChatMembers };
export type { ChatRole };
