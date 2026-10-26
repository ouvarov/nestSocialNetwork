import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { StorageService } from './storage.service';

const LOCAL_UPLOADS_DIR = join(process.cwd(), 'uploads');
const LOCAL_UPLOADS_ROUTE = '/uploads';

class LocalStorageService extends StorageService {
  constructor(private readonly baseUrl: string) {
    super();
  }

  async save(path: string, data: Buffer): Promise<string> {
    const filePath = join(LOCAL_UPLOADS_DIR, path);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);

    return this.publicUrl(path);
  }

  publicUrl(path: string): string {
    return `${this.baseUrl}${LOCAL_UPLOADS_ROUTE}/${path}`;
  }
}

export { LOCAL_UPLOADS_DIR, LOCAL_UPLOADS_ROUTE, LocalStorageService };
