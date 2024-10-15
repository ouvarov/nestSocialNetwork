import { IsArray, IsDate, IsString, IsUUID } from 'class-validator';

export class PostEntity {
  @IsUUID()
  id: number;

  @IsUUID()
  ownerId: number;

  @IsString()
  image: string;

  @IsString()
  text: string;

  @IsArray()
  likes: [];

  @IsDate()
  createdAt: Date;
}
