import { isNotNull } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { Uploads } from './uploads.schema';
import { Users } from './users.schema';

const Posts = pgTable(
  'posts',
  {
    post_id: uuid('post_id').primaryKey().defaultRandom(),
    owner_id: uuid('owner_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    image_url: text('image_url'),
    image_upload_id: uuid('image_upload_id').references(
      () => Uploads.upload_id,
      { onDelete: 'set null' },
    ),
    text: text('text').notNull(),
    created: timestamp('created', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('posts_owner_created_idx').on(table.owner_id, table.created),
    index('posts_image_upload_id_idx')
      .on(table.image_upload_id)
      .where(isNotNull(table.image_upload_id)),
  ],
);

export { Posts };
