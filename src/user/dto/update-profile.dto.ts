import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { TrimmedString } from '@/common/validation/transforms';

import { MAX_DESCRIPTION_LENGTH, MAX_USER_NAME_LENGTH } from '../user-limits';

const isPresent = (_: object, value: unknown) => value !== undefined;

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Ada Lovelace',
    maxLength: MAX_USER_NAME_LENGTH,
  })
  @ValidateIf(isPresent)
  @TrimmedString()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_USER_NAME_LENGTH)
  userName?: string;

  @ApiPropertyOptional({ maxLength: MAX_DESCRIPTION_LENGTH })
  @ValidateIf(isPresent)
  @TrimmedString()
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'An id from POST /api/upload by the caller; null removes the avatar',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  avatarUploadId?: string | null;
}
