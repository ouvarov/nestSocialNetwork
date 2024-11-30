import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class CreateChatDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  userIds: string[];
}
