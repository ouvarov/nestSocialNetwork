import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'The current password, to confirm' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
