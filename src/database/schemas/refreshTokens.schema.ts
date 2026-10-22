import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { Users } from './users.schema';

const RefreshTokens = pgTable(
  'refresh_tokens',
  {
    token_id: uuid('token_id').primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => Users.user_id, { onDelete: 'cascade' }),
    family_id: uuid('family_id').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    replaced_by: uuid('replaced_by'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('refresh_tokens_family_id_idx').on(table.family_id),
    index('refresh_tokens_user_id_idx').on(table.user_id),
  ],
);

type RefreshToken = typeof RefreshTokens.$inferSelect;

export { RefreshTokens };
export type { RefreshToken };
