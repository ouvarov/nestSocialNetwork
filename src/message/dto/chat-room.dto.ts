import { IsUUID } from 'class-validator';

export class ChatRoomDto {
  @IsUUID()
  chatId: string;
}
