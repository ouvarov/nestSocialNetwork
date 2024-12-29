import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

const Chats = pgTable('Chats', {
  chat_id: uuid('chat_id').primaryKey().defaultRandom(),
  created_at: timestamp('created_at').defaultNow(),
  chat_name: varchar('chat_name', { length: 255 }),
});

export { Chats };
