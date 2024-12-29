import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsArray,
} from 'class-validator';

export class UserDataDto {
  @IsString()
  @IsNotEmpty()
  user_name: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  image_url: string;

  @IsArray()
  following: string;

  @IsArray()
  followers: string;

  @IsString()
  description: string;

  @IsString()
  created: Date;

  @IsString()
  password: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
