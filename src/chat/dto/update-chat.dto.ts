import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

const MAX_CHAT_NAME_LENGTH = 255;

export class UpdateChatDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  chatId: string;

  @ApiProperty({ example: 'Weekend plans' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CHAT_NAME_LENGTH)
  newChatName: string;
}
