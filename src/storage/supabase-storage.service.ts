import { BadGatewayException, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

import { StorageService } from './storage.service';

const LIST_PAGE_SIZE = 100;

class SupabaseStorageService extends StorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: ReturnType<typeof createClient>;

  constructor(
    url: string,
    serviceRoleKey: string,
    private readonly bucket: string,
  ) {
    super();
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async save(path: string, data: Buffer, contentType: string): Promise<string> {
    const storage = this.client.storage.from(this.bucket);
    const { error } = await storage.upload(path, data, {
      contentType,
      upsert: false,
    });

    if (error) {
      this.logger.error(`Upload to ${this.bucket} failed: ${error.message}`);
      throw new BadGatewayException('Could not store the image');
    }

    return this.publicUrl(path);
  }

  publicUrl(path: string): string {
    return this.client.storage.from(this.bucket).getPublicUrl(path).data
      .publicUrl;
  }

  async removeDirectory(path: string): Promise<void> {
    const storage = this.client.storage.from(this.bucket);
    const folder = path.replace(/\/$/, '');
    let removedCount = LIST_PAGE_SIZE;

    while (removedCount === LIST_PAGE_SIZE) {
      const { data: files, error } = await storage.list(folder, {
        limit: LIST_PAGE_SIZE,
      });
      if (error) throw new Error(`Listing ${folder} failed: ${error.message}`);
      if (files.length === 0) return;

      const { error: removeError } = await storage.remove(
        files.map(({ name }) => `${folder}/${name}`),
      );
      if (removeError) {
        throw new Error(`Removing ${folder} failed: ${removeError.message}`);
      }

      removedCount = files.length;
    }
  }
}

export { SupabaseStorageService };
