import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { StorageService } from '@/storage/storage.service';
import { userImagesDir } from '@/storage/user-images';
import { UserService } from '@/user/user.service';

import { detectImageType } from './image-type';

@Injectable()
export class UploadService {
  constructor(
    private readonly storageService: StorageService,
    private readonly userService: UserService,
  ) {}

  async uploadImage(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<string> {
    if (!file) throw new BadRequestException('Image file is required');
    if (!(await this.userService.exists(userId))) {
      throw new UnauthorizedException();
    }

    const imageType = detectImageType(file.buffer);

    if (!imageType) {
      throw new UnsupportedMediaTypeException(
        'Only PNG, JPEG, WebP and GIF images are allowed',
      );
    }

    const path = `${userImagesDir(userId)}${randomUUID()}.${imageType.extension}`;

    return this.storageService.save(path, file.buffer, imageType.contentType);
  }
}
