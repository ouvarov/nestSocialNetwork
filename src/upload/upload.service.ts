import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { StorageService } from '@/storage/storage.service';

import { detectImageType } from './image-type';

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  async uploadImage(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<string> {
    if (!file) throw new BadRequestException('Image file is required');

    const imageType = detectImageType(file.buffer);

    if (!imageType) {
      throw new UnsupportedMediaTypeException(
        'Only PNG, JPEG, WebP and GIF images are allowed',
      );
    }

    const path = `users/${userId}/${randomUUID()}.${imageType.extension}`;

    return this.storageService.save(path, file.buffer, imageType.contentType);
  }
}
