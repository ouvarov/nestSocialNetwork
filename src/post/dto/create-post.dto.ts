import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const MAX_POST_TEXT_LENGTH = 2000;

export class CreatePostDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'An id returned by POST /api/upload for the caller',
  })
  @IsOptional()
  @IsUUID()
  imageUploadId?: string;

  @ApiProperty({ example: 'Shipping a new release this weekend.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_POST_TEXT_LENGTH)
  text: string;
}
