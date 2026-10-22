import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { Users } from './users.schema';

const Posts = pgTable(
  'posts',
  {
    post_id: uuid('post_id').primaryKey().defaultRandom(),
    owner_id: uuid('owner_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    image_url: text('image_url'),
    text: text('text').notNull(),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('posts_owner_created_idx').on(table.owner_id, table.created),
  ],
);

export { Posts };
