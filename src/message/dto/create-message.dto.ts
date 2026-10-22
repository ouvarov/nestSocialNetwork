import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

const MAX_MESSAGE_LENGTH = 2000;

export class CreateMessageDto {
  @IsUUID()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  content: string;
}
