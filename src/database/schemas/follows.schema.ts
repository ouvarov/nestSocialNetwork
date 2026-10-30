import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { Users } from './users.schema';

const Follows = pgTable(
  'follows',
  {
    follower_id: uuid('follower_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    followee_id: uuid('followee_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.follower_id, table.followee_id] }),
    index('follows_followee_created_idx').on(
      table.followee_id,
      table.created,
      table.follower_id,
    ),
    index('follows_follower_created_idx').on(
      table.follower_id,
      table.created,
      table.followee_id,
    ),
    check(
      'follows_no_self_follow',
      sql`${table.follower_id} <> ${table.followee_id}`,
    ),
  ],
);

export { Follows };
