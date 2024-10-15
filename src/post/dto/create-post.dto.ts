import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreatePostDto {
  @IsString()
  image: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;
}
