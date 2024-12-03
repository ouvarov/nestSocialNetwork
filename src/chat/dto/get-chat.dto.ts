import { IsUUID } from 'class-validator';

export class GetChatDto {
  @IsUUID()
  id: string;
}
