import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

const Chats = pgTable('chats', {
  chat_id: uuid('chat_id').primaryKey().defaultRandom(),
  chat_name: varchar('chat_name', { length: 255 }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export { Chats };
