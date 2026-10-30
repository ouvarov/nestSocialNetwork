import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Pass as imageUploadId or avatarUploadId',
  })
  id: string;

  @ApiProperty({ example: 'https://cdn.example.com/users/<id>/<uuid>.png' })
  url: string;

  @ApiProperty({ example: 1200 })
  width: number;

  @ApiProperty({ example: 800 })
  height: number;
}
