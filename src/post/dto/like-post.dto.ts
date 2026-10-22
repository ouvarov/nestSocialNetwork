import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LikePostDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  postId: string;
}
