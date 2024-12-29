import { pgTable, uuid, timestamp, serial, unique } from 'drizzle-orm/pg-core';
import { Chats } from '@/database/schemas/chats.schema';
import { Users } from '@/database/schemas/users.schema';

const ChatMembers = pgTable(
  'ChatMembers',
  {
    chat_member_id: serial('chat_member_id').primaryKey(),
    chat_id: uuid('chat_id')
      .notNull()
      .references(() => Chats.chat_id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    added_at: timestamp('added_at').defaultNow(),
  },
  (table) => ({
    uniqueChatMember: unique().on(table.chat_id, table.user_id),
  }),
);

export { ChatMembers };
