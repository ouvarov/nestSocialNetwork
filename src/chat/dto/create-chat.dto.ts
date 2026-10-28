import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The other person; a chat with yourself is rejected',
  })
  @IsUUID()
  userId: string;
}
