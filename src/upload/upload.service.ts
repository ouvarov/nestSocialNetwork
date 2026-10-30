import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { UploadDatabaseService } from '@/database/upload-database.service';
import { StorageService } from '@/storage/storage.service';
import { userImagesDir } from '@/storage/user-images';
import { UserService } from '@/user/user.service';

import type { UploadResponseDto } from './dto/upload-response.dto';
import { readImageDimensions } from './image-dimensions';
import { detectImageType } from './image-type';

@Injectable()
export class UploadService {
  constructor(
    private readonly storageService: StorageService,
    private readonly uploadDatabaseService: UploadDatabaseService,
    private readonly userService: UserService,
  ) {}

  async uploadImage(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UploadResponseDto> {
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

    const dimensions = readImageDimensions(file.buffer);

    if (!dimensions) {
      throw new UnsupportedMediaTypeException('Unreadable image');
    }

    const storageKey = `${userImagesDir(userId)}${randomUUID()}.${imageType.extension}`;
    const url = await this.storageService.save(
      storageKey,
      file.buffer,
      imageType.contentType,
    );
    const id = await this.uploadDatabaseService
      .create({
        ownerId: userId,
        storageKey,
        contentType: imageType.contentType,
        sizeBytes: file.buffer.length,
        ...dimensions,
      })
      .catch(async (error: unknown) => {
        await this.storageService.remove(storageKey).catch(() => undefined);
        throw error;
      });

    return { id, url, ...dimensions };
  }
}
