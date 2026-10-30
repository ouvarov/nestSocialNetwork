import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@/database/drizzle';
import { Posts } from '@/database/schemas/posts.schema';
import { Uploads, type Upload } from '@/database/schemas/uploads.schema';
import { Users } from '@/database/schemas/users.schema';

type NewUpload = {
  ownerId: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

@Injectable()
export class UploadDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(upload: NewUpload): Promise<string> {
    const [created] = await this.db
      .insert(Uploads)
      .values({
        owner_id: upload.ownerId,
        storage_key: upload.storageKey,
        content_type: upload.contentType,
        size_bytes: upload.sizeBytes,
        width: upload.width,
        height: upload.height,
      })
      .returning({ id: Uploads.upload_id });

    return created.id;
  }

  async isOwnedBy(uploadId: string, ownerId: string): Promise<boolean> {
    const [upload] = await this.db
      .select({ id: Uploads.upload_id })
      .from(Uploads)
      .where(
        and(eq(Uploads.upload_id, uploadId), eq(Uploads.owner_id, ownerId)),
      );

    return upload !== undefined;
  }

  async deleteIfUnused(
    uploadId: string,
  ): Promise<Upload['storage_key'] | null> {
    const [deleted] = await this.db
      .delete(Uploads)
      .where(
        and(
          eq(Uploads.upload_id, uploadId),
          sql`not exists (select 1 from ${Users} where ${Users.avatar_upload_id} = ${uploadId})`,
          sql`not exists (select 1 from ${Posts} where ${Posts.image_upload_id} = ${uploadId})`,
        ),
      )
      .returning({ storageKey: Uploads.storage_key });

    return deleted?.storageKey ?? null;
  }
}
