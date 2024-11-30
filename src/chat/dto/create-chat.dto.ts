import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class CreateChatDto {
  @IsArray() // Проверка, что это массив
  @ArrayNotEmpty() // Проверка, что массив не пустой
  @IsUUID('4', { each: true }) // Проверка, что каждый элемент массива является UUID
  userIds: string[]; // Массив UUID пользователей, участвующих в чате
}
