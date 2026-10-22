import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { Posts } from './posts.schema';
import { Users } from './users.schema';

const Likes = pgTable(
  'post_likes',
  {
    post_id: uuid('post_id')
      .notNull()
      .references(() => Posts.post_id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.post_id, table.user_id] })],
);

export { Likes };
