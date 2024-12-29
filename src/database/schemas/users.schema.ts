import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

const Users = pgTable('Users', {
  user_id: uuid('user_id').primaryKey().defaultRandom(),
  user_name: varchar('user_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  image_url: varchar('image_url', { length: 255 }),
  following: varchar('following', { length: 255 }).default('{}'),
  followers: varchar('followers', { length: 255 }).default('{}'),
  description: text('description').default(''),
  created: timestamp('created').defaultNow(),
  password: varchar('password', { length: 255 }).notNull(),
});

export { Users };
