import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { Chats } from './chats.schema';
import { Users } from './users.schema';

const ChatMembers = pgTable(
  'chat_members',
  {
    chat_id: uuid('chat_id')
      .notNull()
      .references(() => Chats.chat_id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    added_at: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chat_id, table.user_id] }),
    index('chat_members_user_id_idx').on(table.user_id),
  ],
);

export { ChatMembers };
