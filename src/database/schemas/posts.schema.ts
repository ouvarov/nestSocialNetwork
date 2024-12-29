import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

import { Users } from '@/database/schemas/users.schema';

const Posts = pgTable('Posts', {
  post_id: uuid('post_id').primaryKey().defaultRandom(),
  owner_id: uuid('owner_id')
    .notNull()
    .references(() => Users.user_id, { onDelete: 'cascade' }),
  image_url: text('image_url').notNull(),
  text: text('text').notNull(),
  created: timestamp('created').defaultNow(),
});

export { Posts };
