import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/database-orm/schemas/users.schema.ts',
    './src/database-orm/schemas/chatMembers.schema.ts',
    './src/database-orm/schemas/chats.schema.ts',
    './src/database-orm/schemas/messages.schema.ts',
    './src/database-orm/schemas/posts.schema.ts',
    './src/database-orm/schemas/likes.schema.ts',
  ],
  out: './drizzle/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
