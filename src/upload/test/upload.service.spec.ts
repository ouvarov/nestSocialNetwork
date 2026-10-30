import {
  BadRequestException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import type { UploadDatabaseService } from '@/database/upload-database.service';
import type { StorageService } from '@/storage/storage.service';
import type { UserService } from '@/user/user.service';

import { orientDimensions } from '../image-dimensions';
import { detectImageType } from '../image-type';
import { UploadService } from '../upload.service';

const PNG_3X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAEklEQVR42mP8z8Dwn4EBiBkYAA8AAf/YmYh+AAAAAElFTkSuQmCC',
  'base64',
);
const JPEG_3X2 = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00,
  0x02, 0x00, 0x03, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  0xff, 0xd9,
]);
const BROKEN_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0,
]);
const WEBP = Buffer.from('RIFF\0\0\0\0WEBPVP8 ');
const GIF = Buffer.from('GIF89a...');
const SVG = Buffer.from('<svg onload="alert(1)"></svg>');
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

const asUpload = (buffer: Buffer, mimetype = 'image/png') =>
  ({ buffer, mimetype, originalname: 'photo.png' }) as Express.Multer.File;

const createUploadService = (existingUserIds = ['user-1']) => {
  const saved: { path: string; contentType: string }[] = [];
  const recorded: unknown[] = [];
  const storage = {
    save: (path: string, _data: Buffer, contentType: string) => {
      saved.push({ path, contentType });
      return Promise.resolve(`https://cdn.test/${path}`);
    },
  };
  const uploads = {
    create: (upload: unknown) => {
      recorded.push(upload);
      return Promise.resolve('upload-1');
    },
  };
  const users = {
    exists: (id: string) => Promise.resolve(existingUserIds.includes(id)),
  };

  return {
    uploadService: new UploadService(
      storage as unknown as StorageService,
      uploads as unknown as UploadDatabaseService,
      users as unknown as UserService,
    ),
    saved,
    recorded,
  };
};

describe('detectImageType', () => {
  it.each([
    ['png', PNG_3X2, 'image/png'],
    ['jpeg', JPEG_3X2, 'image/jpeg'],
    ['webp', WEBP, 'image/webp'],
    ['gif', GIF, 'image/gif'],
  ])('recognises %s by its bytes', (_name, buffer, contentType) => {
    expect(detectImageType(buffer)?.contentType).toBe(contentType);
  });

  it.each([
    ['svg', SVG],
    ['html', HTML],
  ])('rejects %s', (_name, buffer) => {
    expect(detectImageType(buffer)).toBeNull();
  });
});

describe('orientDimensions', () => {
  it('swaps width and height for a photo stored sideways', () => {
    expect(
      orientDimensions({ width: 4000, height: 3000, orientation: 6 }),
    ).toEqual({ width: 3000, height: 4000 });
  });

  it.each([undefined, 1, 3])(
    'keeps the size for orientation %s',
    (orientation) => {
      expect(
        orientDimensions({ width: 4000, height: 3000, orientation }),
      ).toEqual({
        width: 4000,
        height: 3000,
      });
    },
  );
});

describe('UploadService', () => {
  it('stores the image under the user and records its type and size', async () => {
    const { uploadService, saved, recorded } = createUploadService();

    const upload = await uploadService.uploadImage(
      'user-1',
      asUpload(JPEG_3X2, 'image/png'),
    );

    expect(saved[0].path).toMatch(/^users\/user-1\/[0-9a-f-]{36}\.jpg$/);
    expect(saved[0].contentType).toBe('image/jpeg');
    expect(recorded).toEqual([
      {
        ownerId: 'user-1',
        storageKey: saved[0].path,
        contentType: 'image/jpeg',
        sizeBytes: JPEG_3X2.length,
        width: 3,
        height: 2,
      },
    ]);
    expect(upload).toEqual({
      id: 'upload-1',
      url: `https://cdn.test/${saved[0].path}`,
      width: 3,
      height: 2,
    });
  });

  it('rejects an html file sent as image/png', async () => {
    const { uploadService, saved } = createUploadService();

    await expect(
      uploadService.uploadImage('user-1', asUpload(HTML, 'image/png')),
    ).rejects.toThrow(UnsupportedMediaTypeException);
    expect(saved).toHaveLength(0);
  });

  it('rejects a file with an image signature but no readable size', async () => {
    const { uploadService, saved, recorded } = createUploadService();

    await expect(
      uploadService.uploadImage('user-1', asUpload(BROKEN_PNG)),
    ).rejects.toThrow(UnsupportedMediaTypeException);
    expect(saved).toHaveLength(0);
    expect(recorded).toHaveLength(0);
  });

  it('rejects an upload from a deleted account', async () => {
    const { uploadService, saved } = createUploadService([]);

    await expect(
      uploadService.uploadImage('user-1', asUpload(PNG_3X2)),
    ).rejects.toThrow(UnauthorizedException);
    expect(saved).toHaveLength(0);
  });

  it('rejects a request without a file', async () => {
    const { uploadService } = createUploadService();

    await expect(
      uploadService.uploadImage('user-1', undefined),
    ).rejects.toThrow(BadRequestException);
  });
});
