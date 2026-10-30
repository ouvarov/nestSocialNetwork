import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env.schema';
import { DatabaseModule } from '@/database/database.module';
import { UploadDatabaseService } from '@/database/upload-database.service';

import { createStorage } from './create-storage';
import { StorageService } from './storage.service';
import { UploadCleanupService } from './upload-cleanup.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    UploadDatabaseService,
    UploadCleanupService,
    {
      provide: StorageService,
      useFactory: (config: ConfigService<Env, true>): StorageService =>
        createStorage({
          STORAGE_DRIVER: config.get('STORAGE_DRIVER', { infer: true }),
          PUBLIC_URL: config.get('PUBLIC_URL', { infer: true }),
          SUPABASE_URL: config.get('SUPABASE_URL', { infer: true }),
          SUPABASE_SERVICE_ROLE_KEY: config.get('SUPABASE_SERVICE_ROLE_KEY', {
            infer: true,
          }),
          SUPABASE_BUCKET: config.get('SUPABASE_BUCKET', { infer: true }),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [StorageService, UploadDatabaseService, UploadCleanupService],
})
export class StorageModule {}
