import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

type DependencyStatus = 'up' | 'down' | 'disabled';

type Readiness = {
  ready: boolean;
  database: DependencyStatus;
  redis: DependencyStatus;
};

const probe = async (
  check: () => Promise<unknown>,
): Promise<DependencyStatus> => {
  try {
    await check();
    return 'up';
  } catch {
    return 'down';
  }
};

@Injectable()
export class HealthService {
  constructor(
    @Inject('DRIZZLE_ORM') private readonly db: PostgresJsDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  async checkReadiness(): Promise<Readiness> {
    const redis = this.redis;
    const [database, redisStatus] = await Promise.all([
      probe(() => this.db.execute(sql`select 1`)),
      redis
        ? probe(() => redis.ping())
        : Promise.resolve<DependencyStatus>('disabled'),
    ]);

    return {
      ready: database === 'up' && redisStatus !== 'down',
      database,
      redis: redisStatus,
    };
  }
}

export type { Readiness };
