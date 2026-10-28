import {
  BadRequestException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import type { UserService } from '@/user/user.service';

import { detectImageType } from '../image-type';
import { UploadService } from '../upload.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]);
const WEBP = Buffer.from('RIFF\0\0\0\0WEBPVP8 ');
const GIF = Buffer.from('GIF89a...');
const SVG = Buffer.from('<svg onload="alert(1)"></svg>');
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

const asUpload = (buffer: Buffer, mimetype = 'image/png') =>
  ({ buffer, mimetype, originalname: 'photo.png' }) as Express.Multer.File;

const createUploadService = (existingUserIds = ['user-1']) => {
  const saved: { path: string; contentType: string }[] = [];
  const storage = {
    save: (path: string, _data: Buffer, contentType: string) => {
      saved.push({ path, contentType });
      return Promise.resolve(`https://cdn.test/${path}`);
    },
    publicUrl: (path: string) => `https://cdn.test/${path}`,
    removeDirectory: () => Promise.resolve(),
  };

  return {
    uploadService: new UploadService(storage, {
      exists: (id: string) => Promise.resolve(existingUserIds.includes(id)),
    } as unknown as UserService),
    saved,
  };
};

describe('detectImageType', () => {
  it.each([
    ['png', PNG, 'image/png'],
    ['jpeg', JPEG, 'image/jpeg'],
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

describe('UploadService', () => {
  it('stores the image under the user with a generated name and the detected type', async () => {
    const { uploadService, saved } = createUploadService();

    const url = await uploadService.uploadImage(
      'user-1',
      asUpload(JPEG, 'image/png'),
    );

    expect(saved[0].path).toMatch(/^users\/user-1\/[0-9a-f-]{36}\.jpg$/);
    expect(saved[0].contentType).toBe('image/jpeg');
    expect(url).toBe(`https://cdn.test/${saved[0].path}`);
  });

  it('rejects an html file sent as image/png', async () => {
    const { uploadService, saved } = createUploadService();

    await expect(
      uploadService.uploadImage('user-1', asUpload(HTML, 'image/png')),
    ).rejects.toThrow(UnsupportedMediaTypeException);
    expect(saved).toHaveLength(0);
  });

  it('rejects an upload from a deleted account', async () => {
    const { uploadService, saved } = createUploadService([]);

    await expect(
      uploadService.uploadImage('user-1', asUpload(JPEG)),
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
