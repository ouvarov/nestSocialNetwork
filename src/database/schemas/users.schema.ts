import { isNotNull, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  index,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { Uploads } from './uploads.schema';

const Users = pgTable(
  'users',
  {
    user_id: uuid('user_id').primaryKey().defaultRandom(),
    user_name: varchar('user_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    image_url: text('image_url'),
    avatar_upload_id: uuid('avatar_upload_id').references(
      (): AnyPgColumn => Uploads.upload_id,
      { onDelete: 'set null' },
    ),
    description: text('description').notNull().default(''),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
    password: varchar('password', { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
    index('users_avatar_upload_id_idx')
      .on(table.avatar_upload_id)
      .where(isNotNull(table.avatar_upload_id)),
  ],
);

type User = typeof Users.$inferSelect;

export { Users };
export type { User };
