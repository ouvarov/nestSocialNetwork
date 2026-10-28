import { sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const CHAT_KINDS = ['direct'] as const;

type ChatKind = (typeof CHAT_KINDS)[number];

const Chats = pgTable(
  'chats',
  {
    chat_id: uuid('chat_id').primaryKey().defaultRandom(),
    kind: text('kind', { enum: CHAT_KINDS }).notNull().default('direct'),
    pair_key: text('pair_key'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('chats_kind_check', sql`${table.kind} in ('direct')`),
    check(
      'chats_direct_pair_key_check',
      sql`${table.kind} <> 'direct' or ${table.pair_key} is not null`,
    ),
    uniqueIndex('chats_direct_pair_key_uq')
      .on(table.pair_key)
      .where(sql`${table.kind} = 'direct'`),
  ],
);

export { Chats };
export type { ChatKind };
