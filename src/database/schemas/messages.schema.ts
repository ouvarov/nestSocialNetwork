import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { Chats } from './chats.schema';
import { Users } from './users.schema';

const Messages = pgTable(
  'messages',
  {
    message_id: uuid('message_id').primaryKey().defaultRandom(),
    chat_id: uuid('chat_id')
      .notNull()
      .references(() => Chats.chat_id, { onDelete: 'cascade' }),
    sender_id: uuid('sender_id').references(() => Users.user_id, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    sent_at: timestamp('sent_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('messages_chat_sent_idx').on(table.chat_id, table.sent_at),
    index('messages_sender_id_idx').on(table.sender_id),
  ],
);

export { Messages };
