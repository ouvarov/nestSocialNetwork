import { Injectable, Logger } from '@nestjs/common';

import { UploadDatabaseService } from '@/database/upload-database.service';

import { StorageService } from './storage.service';

@Injectable()
export class UploadCleanupService {
  private readonly logger = new Logger(UploadCleanupService.name);

  constructor(
    private readonly uploadDatabaseService: UploadDatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async removeIfUnused(uploadId: string | null): Promise<void> {
    if (!uploadId) return;

    try {
      const storageKey =
        await this.uploadDatabaseService.deleteIfUnused(uploadId);
      if (storageKey) await this.storageService.remove(storageKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not remove upload ${uploadId}: ${reason}`);
    }
  }
}
