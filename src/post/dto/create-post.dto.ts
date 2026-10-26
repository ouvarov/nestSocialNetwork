import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const MAX_POST_TEXT_LENGTH = 2000;

export class CreatePostDto {
  @ApiPropertyOptional({
    description: 'A URL returned by POST /api/upload for the caller',
  })
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  imageUrl?: string;

  @ApiProperty({ example: 'Shipping a new release this weekend.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_POST_TEXT_LENGTH)
  text: string;
}
