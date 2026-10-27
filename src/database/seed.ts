import * as bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { z } from 'zod';

import { ChatMembers } from './schemas/chatMembers.schema';
import { Chats } from './schemas/chats.schema';
import { Likes } from './schemas/likes.schema';
import { Messages } from './schemas/messages.schema';
import { Posts } from './schemas/posts.schema';
import { Users } from './schemas/users.schema';

const DEMO_PASSWORD = 'pulse-demo-password';
const PASSWORD_SALT_ROUNDS = 10;
const MINUTE_MS = 60_000;

const DEMO_USERS = [
  {
    user_name: 'Ada Lovelace',
    email: 'ada@example.com',
    description: 'Writing notes on the Analytical Engine.',
  },
  {
    user_name: 'Linus Torvalds',
    email: 'linus@example.com',
    description: 'Talk is cheap. Show me the code.',
  },
  {
    user_name: 'Grace Hopper',
    email: 'grace@example.com',
    description: 'It is easier to ask forgiveness than permission.',
  },
];

const seedEnvSchema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DEMO_MODE: z.enum(['true', 'false']).default('false'),
});

const demoImageUrl = (seed: string) =>
  `https://picsum.photos/seed/${seed}/800/600`;

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * MINUTE_MS);

const seed = async () => {
  const env = seedEnvSchema.parse(process.env);

  if (env.NODE_ENV === 'production' && env.DEMO_MODE !== 'true') {
    throw new Error('Refusing to wipe a production database outside demo mode');
  }

  const client = postgres(env.DATABASE_URL, { max: 1, onnotice: () => {} });
  const db = drizzle(client);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_SALT_ROUNDS);

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw('TRUNCATE users, chats CASCADE'));

      const [ada, linus, grace] = await tx
        .insert(Users)
        .values(DEMO_USERS.map((user) => ({ ...user, password: passwordHash })))
        .returning({ id: Users.user_id });

      const [adaPost, linusPost, gracePost] = await tx
        .insert(Posts)
        .values([
          {
            owner_id: ada.id,
            text: 'Notes on the Analytical Engine, part one.',
            image_url: demoImageUrl('pulse-ada'),
            created: minutesAgo(180),
          },
          {
            owner_id: linus.id,
            text: 'Shipping a new release this weekend.',
            image_url: demoImageUrl('pulse-linus'),
            created: minutesAgo(90),
          },
          {
            owner_id: grace.id,
            text: 'Found an actual bug in the relay today.',
            image_url: demoImageUrl('pulse-grace'),
            created: minutesAgo(30),
          },
        ])
        .returning({ id: Posts.post_id });

      await tx.insert(Likes).values([
        { post_id: adaPost.id, user_id: linus.id },
        { post_id: adaPost.id, user_id: grace.id },
        { post_id: linusPost.id, user_id: ada.id },
        { post_id: gracePost.id, user_id: ada.id },
      ]);

      const [chat] = await tx
        .insert(Chats)
        .values({ chat_name: 'Ada Lovelace, Linus Torvalds' })
        .returning({ id: Chats.chat_id });

      await tx.insert(ChatMembers).values([
        { chat_id: chat.id, user_id: ada.id },
        { chat_id: chat.id, user_id: linus.id },
      ]);

      await tx.insert(Messages).values([
        {
          chat_id: chat.id,
          sender_id: ada.id,
          content: 'Hi Linus, did the build pass?',
          sent_at: minutesAgo(12),
        },
        {
          chat_id: chat.id,
          sender_id: linus.id,
          content: 'Green on the first try. Suspicious.',
          sent_at: minutesAgo(10),
        },
      ]);
    });

    console.log(
      `Seeded ${DEMO_USERS.length} demo users, password: ${DEMO_PASSWORD}`,
    );
  } finally {
    await client.end();
  }
};

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
