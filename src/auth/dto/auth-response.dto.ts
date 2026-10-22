import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '@/user/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'Access token, valid for 15 minutes' })
  access_token: string;

  @ApiProperty({ type: UserResponseDto })
  userData: UserResponseDto;
}
