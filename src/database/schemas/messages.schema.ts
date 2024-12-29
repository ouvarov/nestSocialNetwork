import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { Chats } from '@/database/schemas/chats.schema';
import { Users } from '@/database/schemas/users.schema';

const Messages = pgTable('Messages', {
  message_id: uuid('message_id').primaryKey().defaultRandom(),
  chat_id: uuid('chat_id')
    .notNull()
    .references(() => Chats.chat_id, { onDelete: 'cascade' }),
  sender_id: uuid('sender_id')
    .notNull()
    .references(() => Users.user_id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sent_at: timestamp('sent_at').defaultNow(),
});

export { Messages };
