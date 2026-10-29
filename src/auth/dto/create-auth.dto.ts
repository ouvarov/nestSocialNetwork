import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

import { MaxBytes } from '@/common/validation/max-bytes';
import { NormalizedEmail, TrimmedString } from '@/common/validation/transforms';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const MAX_USER_NAME_LENGTH = 50;

export class CreateAuthDto {
  @ApiProperty({ example: 'ada@example.com' })
  @NormalizedEmail()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'correct-horse-battery',
    minLength: MIN_PASSWORD_LENGTH,
    description: `At most ${MAX_PASSWORD_BYTES} bytes in UTF-8, the bcrypt limit`,
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxBytes(MAX_PASSWORD_BYTES)
  password: string;

  @ApiProperty({ example: 'Ada Lovelace', maxLength: MAX_USER_NAME_LENGTH })
  @TrimmedString()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_USER_NAME_LENGTH)
  userName: string;
}
