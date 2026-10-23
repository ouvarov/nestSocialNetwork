import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env.schema';

import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

const createStorage = (config: ConfigService<Env, true>): StorageService => {
  if (config.get('STORAGE_DRIVER', { infer: true }) === 'local') {
    return new LocalStorageService(config.get('PUBLIC_URL', { infer: true }));
  }

  return new SupabaseStorageService(
    config.get('SUPABASE_URL', { infer: true }) ?? '',
    config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }) ?? '',
    config.get('SUPABASE_BUCKET', { infer: true }),
  );
};

@Module({
  providers: [
    {
      provide: StorageService,
      useFactory: createStorage,
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
