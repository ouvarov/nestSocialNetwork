import * as bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { z } from 'zod';

import { envObjectSchema } from '../config/env.schema';
import { createStorage } from '../storage/create-storage';
import type { StorageService } from '../storage/storage.service';
import { userImagesDir } from '../storage/user-images';
import { readImageDimensions } from '../upload/image-dimensions';
import { detectImageType } from '../upload/image-type';
import { ChatMembers } from './schemas/chatMembers.schema';
import { Chats } from './schemas/chats.schema';
import { Follows } from './schemas/follows.schema';
import { Likes } from './schemas/likes.schema';
import { Messages } from './schemas/messages.schema';
import { Posts } from './schemas/posts.schema';
import { Uploads } from './schemas/uploads.schema';
import { Users } from './schemas/users.schema';

const DEMO_PASSWORD = 'pulse-demo-password';
const PASSWORD_SALT_ROUNDS = 10;
const MINUTE_MS = 60_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;

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

const seedEnvSchema = envObjectSchema
  .pick({
    DATABASE_URL: true,
    NODE_ENV: true,
    STORAGE_DRIVER: true,
    PUBLIC_URL: true,
    SUPABASE_URL: true,
    SUPABASE_SERVICE_ROLE_KEY: true,
    SUPABASE_BUCKET: true,
  })
  .extend({ DEMO_MODE: z.enum(['true', 'false']).default('false') });

type DemoUpload = typeof Uploads.$inferInsert & { upload_id: string };

const picsumUrl = (seed: string, width: number, height: number) =>
  `https://picsum.photos/seed/${seed}/${width}/${height}`;

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * MINUTE_MS);

const storeDemoImage = async (
  storage: StorageService,
  ownerId: string,
  sourceUrl: string,
): Promise<DemoUpload> => {
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${sourceUrl} answered ${response.status}`);

  const data = Buffer.from(await response.arrayBuffer());
  const imageType = detectImageType(data);
  const dimensions = readImageDimensions(data);
  if (!imageType || !dimensions)
    throw new Error(`${sourceUrl} is not an image`);

  const uploadId = randomUUID();
  const storageKey = `${userImagesDir(ownerId)}${uploadId}.${imageType.extension}`;
  await storage.save(storageKey, data, imageType.contentType);

  return {
    upload_id: uploadId,
    owner_id: ownerId,
    storage_key: storageKey,
    content_type: imageType.contentType,
    size_bytes: data.length,
    ...dimensions,
  };
};

const seed = async () => {
  const env = seedEnvSchema.parse(process.env);

  if (env.NODE_ENV === 'production' && env.DEMO_MODE !== 'true') {
    throw new Error('Refusing to wipe a production database outside demo mode');
  }

  const storage = createStorage(env);
  const [adaId, linusId, graceId] = DEMO_USERS.map(() => randomUUID());
  const [adaAvatar, linusAvatar, adaImage, linusImage, graceImage] =
    await Promise.all([
      storeDemoImage(storage, adaId, picsumUrl('pulse-ada-avatar', 512, 512)),
      storeDemoImage(
        storage,
        linusId,
        picsumUrl('pulse-linus-avatar', 512, 512),
      ),
      storeDemoImage(storage, adaId, picsumUrl('pulse-ada', 800, 600)),
      storeDemoImage(storage, linusId, picsumUrl('pulse-linus', 800, 600)),
      storeDemoImage(storage, graceId, picsumUrl('pulse-grace', 600, 800)),
    ]);

  const client = postgres(env.DATABASE_URL, { max: 1, onnotice: () => {} });
  const db = drizzle(client);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_SALT_ROUNDS);

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw('TRUNCATE users, chats CASCADE'));

      await tx.insert(Users).values(
        DEMO_USERS.map((user, index) => ({
          ...user,
          user_id: [adaId, linusId, graceId][index],
          password: passwordHash,
        })),
      );
      await tx
        .insert(Uploads)
        .values([adaAvatar, linusAvatar, adaImage, linusImage, graceImage]);
      await tx
        .update(Users)
        .set({ avatar_upload_id: adaAvatar.upload_id })
        .where(eq(Users.user_id, adaId));
      await tx
        .update(Users)
        .set({ avatar_upload_id: linusAvatar.upload_id })
        .where(eq(Users.user_id, linusId));

      await tx.insert(Follows).values([
        { follower_id: linusId, followee_id: adaId },
        { follower_id: graceId, followee_id: adaId },
        { follower_id: adaId, followee_id: graceId },
      ]);

      const [adaPost, linusPost, gracePost] = await tx
        .insert(Posts)
        .values([
          {
            owner_id: adaId,
            text: 'Notes on the Analytical Engine, part one.',
            image_upload_id: adaImage.upload_id,
            created: minutesAgo(180),
          },
          {
            owner_id: linusId,
            text: 'Shipping a new release this weekend.',
            image_upload_id: linusImage.upload_id,
            created: minutesAgo(90),
          },
          {
            owner_id: graceId,
            text: 'Found an actual bug in the relay today.',
            image_upload_id: graceImage.upload_id,
            created: minutesAgo(30),
          },
        ])
        .returning({ id: Posts.post_id });

      await tx.insert(Likes).values([
        { post_id: adaPost.id, user_id: linusId },
        { post_id: adaPost.id, user_id: graceId },
        { post_id: linusPost.id, user_id: adaId },
        { post_id: gracePost.id, user_id: adaId },
      ]);

      const [chat] = await tx
        .insert(Chats)
        .values({
          kind: 'direct',
          pair_key: [adaId, linusId].sort().join(':'),
        })
        .returning({ id: Chats.chat_id });

      await tx.insert(ChatMembers).values([
        { chat_id: chat.id, user_id: adaId },
        { chat_id: chat.id, user_id: linusId },
      ]);

      await tx.insert(Messages).values([
        {
          chat_id: chat.id,
          sender_id: adaId,
          content: 'Hi Linus, did the build pass?',
          sent_at: minutesAgo(12),
        },
        {
          chat_id: chat.id,
          sender_id: linusId,
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
