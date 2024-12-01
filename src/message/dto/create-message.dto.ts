import { IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @IsString()
  content: string;
}
