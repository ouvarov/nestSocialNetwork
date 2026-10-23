import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';

import { UploadService } from './upload.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('upload')
@ApiTags('Upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { url: { type: 'string' } } },
  })
  @ApiPayloadTooLargeResponse({ description: 'Larger than 5 MB' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Not a PNG, JPEG, WebP or GIF',
  })
  async uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ url: string }> {
    return { url: await this.uploadService.uploadImage(user.id, file) };
  }
}
