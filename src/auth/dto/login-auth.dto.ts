import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { NormalizedEmail } from '@/common/validation/transforms';

export class LoginAuthDto {
  @ApiProperty({ example: 'ada@example.com' })
  @NormalizedEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'pulse-demo-password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
