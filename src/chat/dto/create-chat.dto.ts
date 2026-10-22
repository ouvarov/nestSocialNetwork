import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

const MAX_CHAT_MEMBERS = 50;

export class CreateChatDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Other members; the caller is always added',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_CHAT_MEMBERS)
  @IsUUID('4', { each: true })
  userIds: string[];
}
