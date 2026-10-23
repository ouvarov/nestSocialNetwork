import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: 'https://cdn.example.com/users/<id>/<uuid>.png' })
  url: string;
}
