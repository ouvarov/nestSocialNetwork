import type { Env } from '@/config/env.schema';

import { LocalStorageService } from './local-storage.service';
import type { StorageService } from './storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

type StorageEnv = Pick<
  Env,
  | 'STORAGE_DRIVER'
  | 'PUBLIC_URL'
  | 'SUPABASE_URL'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'SUPABASE_BUCKET'
>;

const createStorage = (env: StorageEnv): StorageService =>
  env.STORAGE_DRIVER === 'local'
    ? new LocalStorageService(env.PUBLIC_URL)
    : new SupabaseStorageService(
        env.SUPABASE_URL ?? '',
        env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        env.SUPABASE_BUCKET,
      );

export { createStorage };
export type { StorageEnv };
