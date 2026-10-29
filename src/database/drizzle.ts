import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

const DRIZZLE = Symbol('DRIZZLE');

type Database = PostgresJsDatabase;

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export { DRIZZLE };
export type { Database, Transaction };
