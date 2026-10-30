import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { Users } from './users.schema';

const Uploads = pgTable(
  'uploads',
  {
    upload_id: uuid('upload_id').primaryKey().defaultRandom(),
    owner_id: uuid('owner_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    storage_key: text('storage_key').notNull().unique(),
    content_type: varchar('content_type', { length: 32 }).notNull(),
    size_bytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('uploads_owner_id_idx').on(table.owner_id),
    check(
      'uploads_size_check',
      sql`(${table.width} is null) = (${table.height} is null) and (${table.width} is null or (${table.width} > 0 and ${table.height} > 0))`,
    ),
  ],
);

type Upload = typeof Uploads.$inferSelect;

export { Uploads };
export type { Upload };
