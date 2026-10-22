import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePostDto {
  @IsString()
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
