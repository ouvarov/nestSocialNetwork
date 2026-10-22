import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

const Users = pgTable('users', {
  user_id: uuid('user_id').primaryKey().defaultRandom(),
  user_name: varchar('user_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  image_url: text('image_url'),
  description: text('description').notNull().default(''),
  created: timestamp('created', { withTimezone: true }).notNull().defaultNow(),
  password: varchar('password', { length: 255 }).notNull(),
});

type User = typeof Users.$inferSelect;

export { Users };
export type { User };
