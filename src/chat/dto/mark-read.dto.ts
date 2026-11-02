import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MarkReadDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'The newest message you have seen; without it, the whole chat is read',
  })
  @IsOptional()
  @IsUUID()
  upToMessageId?: string;
}
