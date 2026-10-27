import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { envObjectSchema } from '../config/env.schema';

const MIGRATIONS_FOLDER = 'drizzle';

const runMigrations = async () => {
  const { DATABASE_URL } = envObjectSchema
    .pick({ DATABASE_URL: true })
    .parse(process.env);
  const client = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log('Migrations applied');
  } finally {
    await client.end();
  }
};

runMigrations().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
