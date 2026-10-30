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
  ApiTooManyRequestsResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser, type AuthUser } from '@/auth/current-user.decorator';

import { UploadResponseDto } from './dto/upload-response.dto';
import { UploadService } from './upload.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = { default: { ttl: 60_000, limit: 20 } };

@Controller('upload')
@ApiTags('Upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Throttle(UPLOAD_RATE_LIMIT)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadResponseDto })
  @ApiPayloadTooLargeResponse({ description: 'Larger than 5 MB' })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Not a readable PNG, JPEG, WebP or GIF',
  })
  @ApiTooManyRequestsResponse()
  uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadResponseDto> {
    return this.uploadService.uploadImage(user.id, file);
  }
}
