import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateChatDto {
  @IsUUID()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  newChatName: string;
}
