import { BadGatewayException, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

import { StorageService } from './storage.service';

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
}

export { SupabaseStorageService };
