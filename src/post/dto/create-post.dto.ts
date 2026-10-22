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
  @ApiPropertyOptional({ example: 'https://picsum.photos/seed/pulse/800/600' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  imageUrl?: string;

  @ApiProperty({ example: 'Shipping a new release this weekend.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_POST_TEXT_LENGTH)
  text: string;
}
