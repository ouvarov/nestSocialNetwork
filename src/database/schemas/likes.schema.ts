import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { Posts } from '@/database/schemas/posts.schema';
import { Users } from '@/database/schemas/users.schema';

const Likes = pgTable('Likes', {
  like_id: uuid('like_id').primaryKey().defaultRandom(),
  post_id: uuid('post_id')
    .notNull()
    .references(() => Posts.post_id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => Users.user_id, { onDelete: 'cascade' }),
  created: timestamp('created').defaultNow(),
});

export { Likes };
