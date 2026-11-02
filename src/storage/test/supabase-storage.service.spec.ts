import { BadGatewayException, Logger } from '@nestjs/common';

import { SupabaseStorageService } from '../supabase-storage.service';

type StorageError = { message: string } | null;

const mockState = {
  files: new Map<string, string[]>(),
  uploadError: null as StorageError,
  removed: [] as string[][],
};

const splitPath = (path: string): [string, string] => {
  const slash = path.lastIndexOf('/');
  return [path.slice(0, slash), path.slice(slash + 1)];
};

const mockBucket = {
  upload: jest.fn((path: string) =>
    Promise.resolve({ data: { path }, error: mockState.uploadError }),
  ),
  getPublicUrl: (path: string) => ({
    data: { publicUrl: `https://cdn.test/images/${path}` },
  }),
  list: jest.fn((folder: string, { limit }: { limit: number }) =>
    Promise.resolve({
      data: (mockState.files.get(folder) ?? [])
        .slice(0, limit)
        .map((name) => ({ name })),
      error: null,
    }),
  ),
  remove: jest.fn((paths: string[]) => {
    mockState.removed.push(paths);
    for (const path of paths) {
      const [folder, name] = splitPath(path);
      mockState.files.set(
        folder,
        (mockState.files.get(folder) ?? []).filter((file) => file !== name),
      );
    }
    return Promise.resolve({ data: [], error: null });
  }),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ storage: { from: () => mockBucket } }),
}));

const createService = () =>
  new SupabaseStorageService('https://project.supabase.co', 'key', 'images');

describe('SupabaseStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockState.files.clear();
    mockState.removed = [];
    mockState.uploadError = null;
  });

  it('uploads without overwriting and returns the public URL', async () => {
    const url = await createService().save(
      'users/u1/a.png',
      Buffer.from('png'),
      'image/png',
    );

    expect(mockBucket.upload).toHaveBeenCalledWith(
      'users/u1/a.png',
      expect.any(Buffer),
      { contentType: 'image/png', upsert: false },
    );
    expect(url).toBe('https://cdn.test/images/users/u1/a.png');
  });

  it('answers 502 when the upload fails', async () => {
    mockState.uploadError = { message: 'The resource already exists' };

    await expect(
      createService().save('users/u1/a.png', Buffer.from('png'), 'image/png'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('removes one file by its key', async () => {
    await createService().remove('users/u1/a.png');

    expect(mockState.removed).toEqual([['users/u1/a.png']]);
  });

  it('removes a whole folder page by page', async () => {
    const names = Array.from({ length: 150 }, (_, index) => `${index}.png`);
    mockState.files.set('users/u1', names);

    await createService().removeDirectory('users/u1/');

    expect(mockState.files.get('users/u1')).toEqual([]);
    expect(mockState.removed.map((batch) => batch.length)).toEqual([100, 50]);
  });
});
